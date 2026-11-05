package com.za.shop.settings.internal;

import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** An editable text page (imprint, terms, privacy, returns). */
@Entity
@Table(name = "content_pages")
public class ContentPage {

    @Id
    private String slug;

    private String title;

    private String body;

    private Instant updatedAt;

    private boolean isTemplate;

    protected ContentPage() {
    }

    ContentPage(String slug, String title, String body) {
        this.slug = slug;
        this.title = title;
        this.body = body;
        this.isTemplate = true;
    }

    void edit(String title, String body, Instant now) {
        this.title = title;
        this.body = body;
        this.updatedAt = now;
        this.isTemplate = false;
    }

    public String getSlug() {
        return slug;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean isTemplate() {
        return isTemplate;
    }
}
