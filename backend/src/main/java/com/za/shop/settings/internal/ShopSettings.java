package com.za.shop.settings.internal;

import java.time.Instant;

import com.za.shop.settings.Theme;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "shop_settings")
public class ShopSettings {

    public static final short SINGLETON_ID = 1;

    @Id
    private Short id;

    private String name;

    private String tagline;

    @Enumerated(EnumType.STRING)
    private Theme theme;

    private String accentColor;

    private String logoKey;

    private String logoUrl;

    private Instant updatedAt;

    @Version
    private Long version;

    protected ShopSettings() {
    }

    public ShopSettings(String name, Theme theme, Instant now) {
        this.id = SINGLETON_ID;
        this.name = name;
        this.theme = theme;
        this.updatedAt = now;
    }

    public void update(String name, String tagline, Theme theme, String accentColor, Instant now) {
        this.name = name;
        this.tagline = tagline;
        this.theme = theme;
        this.accentColor = accentColor;
        this.updatedAt = now;
    }

    /** @return the storage key of the logo being replaced, or null */
    public String replaceLogo(String key, String url, Instant now) {
        String previous = logoKey;
        this.logoKey = key;
        this.logoUrl = url;
        this.updatedAt = now;
        return previous;
    }

    public String getName() {
        return name;
    }

    public String getTagline() {
        return tagline;
    }

    public Theme getTheme() {
        return theme;
    }

    public String getAccentColor() {
        return accentColor;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
