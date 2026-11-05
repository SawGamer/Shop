package com.za.shop.settings.internal;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@Tag(name = "Content pages")
class PagesController {

    record UpdatePageRequest(@NotBlank @Size(max = 120) String title, @NotBlank @Size(max = 50_000) String body) {
    }

    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic()
            .staleWhileRevalidate(Duration.ofMinutes(5));

    private final ContentPageService pages;

    PagesController(ContentPageService pages) {
        this.pages = pages;
    }

    @GetMapping("/api/v1/pages")
    ResponseEntity<List<ContentPageService.Summary>> list() {
        return ResponseEntity.ok().cacheControl(CACHE).body(pages.summaries());
    }

    @GetMapping("/api/v1/pages/{slug}")
    ResponseEntity<ContentPageService.PageView> get(@PathVariable String slug) {
        return ResponseEntity.ok().cacheControl(CACHE).body(pages.get(slug));
    }

    @PutMapping("/api/v1/admin/pages/{slug}")
    ContentPageService.PageView update(@PathVariable String slug, @Valid @RequestBody UpdatePageRequest request) {
        return pages.update(slug, request.title(), request.body());
    }

    @Component
    @Order(5)
    static class Defaults implements ApplicationRunner {

        private final ContentPageService pages;

        Defaults(ContentPageService pages) {
            this.pages = pages;
        }

        @Override
        public void run(ApplicationArguments args) {
            pages.ensureDefaults();
        }
    }
}
