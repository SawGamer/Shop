package com.za.shop.orders.internal;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A snapshot of what was bought. It does not change when the catalog changes later. */
@Entity
@Table(name = "order_lines")
public class OrderLine {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    private int position;

    private UUID variantId;

    private UUID productId;

    private String productSlug;

    private String productName;

    private String sku;

    private String size;

    private String color;

    private String imageUrl;

    private long unitPriceCents;

    private int quantity;

    private long lineTotalCents;

    protected OrderLine() {
    }

    OrderLine(Order order, int position, UUID variantId, UUID productId, String productSlug, String productName,
            String sku, String size, String color, String imageUrl, long unitPriceCents, int quantity) {
        this.order = order;
        this.position = position;
        this.variantId = variantId;
        this.productId = productId;
        this.productSlug = productSlug;
        this.productName = productName;
        this.sku = sku;
        this.size = size;
        this.color = color;
        this.imageUrl = imageUrl;
        this.unitPriceCents = unitPriceCents;
        this.quantity = quantity;
        this.lineTotalCents = Math.multiplyExact(unitPriceCents, quantity);
    }

    public String details() {
        StringBuilder details = new StringBuilder();
        if (size != null) {
            details.append("Size ").append(size);
        }
        if (color != null) {
            details.append(details.isEmpty() ? "" : " · ").append(color);
        }
        return details.toString();
    }

    public UUID getVariantId() {
        return variantId;
    }

    public String getProductSlug() {
        return productSlug;
    }

    public String getProductName() {
        return productName;
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

    public String getImageUrl() {
        return imageUrl;
    }

    public long getUnitPriceCents() {
        return unitPriceCents;
    }

    public int getQuantity() {
        return quantity;
    }

    public long getLineTotalCents() {
        return lineTotalCents;
    }
}
