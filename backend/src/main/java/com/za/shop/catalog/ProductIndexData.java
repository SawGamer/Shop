package com.za.shop.catalog;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * A denormalised view of an active product for search indexing.
 *
 * @param categorySlugs  the product's categories including all their ancestors, so filtering by a
 *                       parent category also finds products of its sub-categories
 * @param minPriceCents  the lowest variant price
 * @param compareAtPriceCents compare-at price of the cheapest variant, only when it is higher than its price
 */
public record ProductIndexData(UUID id, String slug, String name, String description, UUID brandId,
        String brandSlug, String brandName, List<String> categorySlugs, List<String> sizes, List<String> colors,
        long minPriceCents, Long compareAtPriceCents, String imageUrl, List<UUID> variantIds, Instant createdAt) {
}
