package com.za.shop.catalog;

import java.util.UUID;

/**
 * What other modules (cart, orders, back office) need to know about a purchasable variant.
 *
 * @param purchasable false when the product is not ACTIVE any more
 */
public record VariantView(UUID variantId, UUID productId, String productSlug, String productName, String sku,
        String size, String color, long priceCents, Long compareAtPriceCents, String imageUrl, boolean purchasable) {
}
