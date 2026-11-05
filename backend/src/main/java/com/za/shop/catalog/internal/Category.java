package com.za.shop.catalog.internal;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A node of the category tree. The tree is small, so it is loaded whole and assembled in memory. */
@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    private String slug;

    private String name;

    private UUID parentId;

    private int position;

    private Instant createdAt;

    protected Category() {
    }

    public Category(String slug, String name, UUID parentId, int position, Instant createdAt) {
        this.slug = slug;
        this.name = name;
        this.parentId = parentId;
        this.position = position;
        this.createdAt = createdAt;
    }

    public void update(String slug, String name, UUID parentId) {
        this.slug = slug;
        this.name = name;
        this.parentId = parentId;
    }

    public UUID getId() {
        return id;
    }

    public String getSlug() {
        return slug;
    }

    public String getName() {
        return name;
    }

    public UUID getParentId() {
        return parentId;
    }

    public int getPosition() {
        return position;
    }
}
