package com.za.shop.cart;

import java.util.List;
import java.util.UUID;

import com.za.shop.shared.Money;

/** A priced cart. Prices always come from the catalog at read time, never from the client. */
public record CartView(UUID id, List<Item> items, int itemCount, Money subtotal, Money shipping, Money total,
        Money freeShippingThreshold) {

    public record Item(UUID variantId, UUID productId, String productSlug, String productName, String sku, String size,
            String color, String imageUrl, Money unitPrice, int quantity, Money lineTotal, int available,
            boolean inStock) {
    }

    public boolean isEmpty() {
        return items.isEmpty();
    }
}
