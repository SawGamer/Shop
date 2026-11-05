package com.za.shop.settings.internal;

import java.io.IOException;
import java.time.Duration;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.za.shop.settings.ShopSettingsService;
import com.za.shop.settings.ShopSettingsView;
import com.za.shop.shared.ApiException;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@Tag(name = "Shop settings & design")
class SettingsController {

    record UpdateSettingsRequest(
            @NotBlank @Size(max = 80) String name,
            @Size(max = 160) String tagline,
            @NotBlank String theme,
            @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "must be a colour like #1a2b3c") String accentColor) {
    }

    private final ShopSettingsService settings;

    SettingsController(ShopSettingsService settings) {
        this.settings = settings;
    }

    @GetMapping("/api/v1/shop")
    ResponseEntity<ShopSettingsView> shop() {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).cachePublic()
                .staleWhileRevalidate(Duration.ofMinutes(1))).body(settings.current());
    }

    @PutMapping("/api/v1/admin/shop")
    ShopSettingsView update(@Valid @RequestBody UpdateSettingsRequest request) {
        return settings.update(request.name(), request.tagline(), request.theme(), request.accentColor());
    }

    @PostMapping(value = "/api/v1/admin/shop/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ShopSettingsView uploadLogo(@RequestPart("file") MultipartFile file) {
        try {
            return settings.replaceLogo(file.getBytes());
        }
        catch (IOException e) {
            throw ApiException.badRequest("VALIDATION_FAILED", "Could not read the uploaded file");
        }
    }

    @DeleteMapping("/api/v1/admin/shop/logo")
    ShopSettingsView removeLogo() {
        return settings.removeLogo();
    }

    @Component
    @Order(5)
    static class Defaults implements ApplicationRunner {

        private final ShopSettingsService settings;

        Defaults(ShopSettingsService settings) {
            this.settings = settings;
        }

        @Override
        public void run(ApplicationArguments args) {
            settings.ensureDefaults();
        }
    }
}
