package com.za.shop.settings;

import java.time.Clock;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.za.shop.media.ImageProcessor;
import com.za.shop.media.MediaStorage;
import com.za.shop.settings.internal.ShopSettings;
import com.za.shop.settings.internal.ShopSettingsRepository;
import com.za.shop.shared.ApiException;
import com.za.shop.shared.ShopProperties;

/** Name and storefront design of the shop. */
@Service
public class ShopSettingsService {

    private final ShopSettingsRepository repository;
    private final ImageProcessor images;
    private final MediaStorage media;
    private final ShopProperties shop;
    private final Clock clock;
    private final String defaultName;
    private final String defaultTheme;

    ShopSettingsService(ShopSettingsRepository repository, ImageProcessor images, MediaStorage media,
            ShopProperties shop, Clock clock, @Value("${shop.settings.name:Z&A}") String defaultName,
            @Value("${shop.seed.catalog:footwear}") String defaultTheme) {
        this.repository = repository;
        this.images = images;
        this.media = media;
        this.shop = shop;
        this.clock = clock;
        this.defaultName = defaultName;
        this.defaultTheme = defaultTheme;
    }

    /** Creates the settings row on first start; its design matches the seeded demo catalog. */
    @Transactional
    public void ensureDefaults() {
        if (!repository.existsById(ShopSettings.SINGLETON_ID)) {
            repository.save(new ShopSettings(defaultName, Theme.fromId(defaultTheme).orElse(Theme.FOOTWEAR),
                    clock.instant()));
        }
    }

    @Transactional(readOnly = true)
    public ShopSettingsView current() {
        return repository.findById(ShopSettings.SINGLETON_ID).map(this::view)
                .orElseGet(() -> new ShopSettingsView(defaultName, null,
                        Theme.fromId(defaultTheme).orElse(Theme.FOOTWEAR).id(), null, null, shop.currency(), null,
                        FulfillmentMode.SHIPPING.name(), shop.timeZone()));
    }

    @Transactional
    public ShopSettingsView update(String name, String tagline, String themeId, String accentColor) {
        Theme theme = Theme.fromId(themeId).orElseThrow(() -> ApiException
                .badRequest("VALIDATION_FAILED", "Unknown design")
                .with("errors", Map.of("theme", "must be one of " + String.join(", ",
                        java.util.Arrays.stream(Theme.values()).map(Theme::id).toList()))));
        ShopSettings settings = load();
        settings.update(name.trim(), tagline == null || tagline.isBlank() ? null : tagline.trim(), theme,
                accentColor == null || accentColor.isBlank() ? null : accentColor.toLowerCase(), clock.instant());
        return view(settings);
    }

    @Transactional
    public ShopSettingsView setFulfillmentMode(FulfillmentMode mode) {
        ShopSettings settings = load();
        settings.setFulfillmentMode(mode, clock.instant());
        return view(settings);
    }

    @Transactional(readOnly = true)
    public boolean isLocalFulfillment() {
        return current().fulfillmentMode().equals(FulfillmentMode.LOCAL.name());
    }

    @Transactional
    public ShopSettingsView replaceLogo(byte[] upload) {
        if (upload.length > 2 * 1024 * 1024) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "The logo must be 2 MB or smaller");
        }
        ImageProcessor.ProcessedImage logo = images.toLogoPng(upload);
        MediaStorage.StoredObject stored = media.store("branding/logo-" + UUID.randomUUID() + "." + logo.extension(),
                logo.content(), logo.contentType());
        deleteAfterCommit(load().replaceLogo(stored.key(), stored.url(), clock.instant()));
        return view(load());
    }

    @Transactional
    public ShopSettingsView removeLogo() {
        deleteAfterCommit(load().replaceLogo(null, null, clock.instant()));
        return view(load());
    }

    private ShopSettings load() {
        ensureDefaults();
        return repository.findById(ShopSettings.SINGLETON_ID).orElseThrow();
    }

    private void deleteAfterCommit(String key) {
        if (key == null) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                media.delete(key);
            }
        });
    }

    private ShopSettingsView view(ShopSettings s) {
        return new ShopSettingsView(s.getName(), s.getTagline(), s.getTheme().id(), s.getAccentColor(),
                s.getLogoUrl(), shop.currency(), s.getUpdatedAt(), s.getFulfillmentMode().name(), shop.timeZone());
    }
}
