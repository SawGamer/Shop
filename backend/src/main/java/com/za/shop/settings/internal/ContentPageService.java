package com.za.shop.settings.internal;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.shared.ApiException;

/** The shop's legal and information pages. */
@Service
class ContentPageService {

    record Summary(String slug, String title, boolean isTemplate) {
    }

    record PageView(String slug, String title, boolean isTemplate, String body, Instant updatedAt) {
    }

    private final ContentPageRepository pages;
    private final Clock clock;

    ContentPageService(ContentPageRepository pages, Clock clock) {
        this.pages = pages;
        this.clock = clock;
    }

    /** Adds the starter text of every page that does not exist yet. */
    @Transactional
    void ensureDefaults() {
        PageTemplates.ALL.forEach((slug, template) -> {
            if (!pages.existsById(slug)) {
                pages.save(new ContentPage(slug, template.title(), template.body().strip()));
            }
        });
    }

    @Transactional(readOnly = true)
    List<Summary> summaries() {
        return PageTemplates.ALL.keySet().stream().map(slug -> pages.findById(slug).orElse(null))
                .filter(p -> p != null).map(p -> new Summary(p.getSlug(), p.getTitle(), p.isTemplate())).toList();
    }

    @Transactional(readOnly = true)
    PageView get(String slug) {
        return pages.findById(slug).map(ContentPageService::view).orElseThrow(() -> ApiException.notFound("Page"));
    }

    @Transactional
    PageView update(String slug, String title, String body) {
        ContentPage page = pages.findById(slug).orElseThrow(() -> ApiException.notFound("Page"));
        page.edit(title.trim(), body.strip(), clock.instant());
        return view(page);
    }

    private static PageView view(ContentPage p) {
        return new PageView(p.getSlug(), p.getTitle(), p.isTemplate(), p.getBody(), p.getUpdatedAt());
    }
}
