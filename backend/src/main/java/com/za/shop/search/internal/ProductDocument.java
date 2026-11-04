package com.za.shop.search.internal;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** The search engine's copy of a product. Search results are served from it without touching the database. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ProductDocument(
        String id,
        String slug,
        String name,
        String description,
        String brandId,
        String brand,
        String brandName,
        List<String> categories,
        List<String> sizes,
        List<String> colors,
        long price,
        Long compareAtPrice,
        boolean onSale,
        boolean inStock,
        String imageUrl,
        long createdAt) {
}
