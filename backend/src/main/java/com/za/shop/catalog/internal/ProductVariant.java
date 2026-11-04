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

/** A purchasable combination such as "size 42, black", with its own SKU and price. */
@Entity
@Table(name = "product_variants")
public class ProductVariant {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    private String sku;

    private String size;

    private String color;

    private long priceCents;

    private Long compareAtPriceCents;

    private int position;

    private Instant createdAt;

    protected ProductVariant() {
    }

    public ProductVariant(Product product, String sku, String size, String color, long priceCents,
            Long compareAtPriceCents, int position, Instant createdAt) {
        this.product = product;
        this.createdAt = createdAt;
        this.position = position;
        update(sku, size, color, priceCents, compareAtPriceCents);
    }

    public void update(String sku, String size, String color, long priceCents, Long compareAtPriceCents) {
        this.sku = sku;
        this.size = size;
        this.color = color;
        this.priceCents = priceCents;
        this.compareAtPriceCents = compareAtPriceCents;
    }

    /** The compare-at price only counts when it is actually higher than the price. */
    public Long effectiveCompareAtCents() {
        return compareAtPriceCents != null && compareAtPriceCents > priceCents ? compareAtPriceCents : null;
    }

    public UUID getId() {
        return id;
    }

    public Product getProduct() {
        return product;
    }

    public String getSku() {
        return sku;
    }

    public String getSize() {
        return size;
    }

    public String getColor() {
        return color;
    }

    public long getPriceCents() {
        return priceCents;
    }

    public Long getCompareAtPriceCents() {
        return compareAtPriceCents;
    }

    public int getPosition() {
        return position;
    }
}
