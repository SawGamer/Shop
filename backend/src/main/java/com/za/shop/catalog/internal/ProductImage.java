package com.za.shop.catalog.internal;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Images live in object storage; the database only keeps their key and public URL. */
@Entity
@Table(name = "product_images")
public class ProductImage {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    private String storageKey;

    private String url;

    private String alt;

    private int position;

    private Instant createdAt;

    protected ProductImage() {
    }

    public ProductImage(Product product, String storageKey, String url, String alt, int position, Instant createdAt) {
        this.product = product;
        this.storageKey = storageKey;
        this.url = url;
        this.alt = alt;
        this.position = position;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getUrl() {
        return url;
    }

    public String getAlt() {
        return alt;
    }

    public int getPosition() {
        return position;
    }
}
