package com.za.shop.catalog.internal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.za.shop.shared.Money;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Request and response shapes of the catalog API (see docs/api.md). */
public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record BrandDto(UUID id, String slug, String name) {
        static BrandDto of(Brand brand) {
            return new BrandDto(brand.getId(), brand.getSlug(), brand.getName());
        }
    }

    public record CategoryRef(UUID id, String slug, String name) {
        static CategoryRef of(Category category) {
            return new CategoryRef(category.getId(), category.getSlug(), category.getName());
        }
    }

    public record CategoryNode(UUID id, String slug, String name, UUID parentId, List<CategoryNode> children) {
    }

    public record ImageDto(UUID id, String url, String alt, int position) {
        static ImageDto of(ProductImage image) {
            return new ImageDto(image.getId(), image.getUrl(), image.getAlt(), image.getPosition());
        }
    }

    public record VariantDto(UUID id, String sku, String size, String color, Money price, Money compareAtPrice,
            int available, boolean inStock) {
    }

    public record ProductDetailDto(UUID id, String slug, String name, String description, BrandDto brand,
            List<CategoryRef> categories, List<ImageDto> images, List<String> sizes, List<String> colors,
            List<VariantDto> variants, Money price, Money compareAtPrice, boolean inStock, ProductStatus status,
            Instant createdAt, Instant updatedAt) {
    }

    public record AdminVariantDto(UUID id, String sku, String size, String color, Money price, Money compareAtPrice,
            int available, boolean inStock, int onHand, int reserved) {
    }

    public record AdminProductDto(UUID id, String slug, String name, String description, BrandDto brand,
            List<CategoryRef> categories, List<ImageDto> images, List<String> sizes, List<String> colors,
            List<AdminVariantDto> variants, Money price, Money compareAtPrice, boolean inStock, ProductStatus status,
            Instant createdAt, Instant updatedAt) {
    }

    public record AdminProductSummaryDto(UUID id, String slug, String name, BrandDto brand, ProductStatus status,
            Money price, int totalAvailable, int variantCount, String imageUrl, Instant updatedAt) {
    }

    private static final String SLUG = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

    public record ProductUpsert(
            @NotBlank @Size(max = 160) String name,
            @Size(max = 160) @Pattern(regexp = SLUG, message = "may only contain a-z, 0-9 and dashes") String slug,
            @Size(max = 20000) String description,
            @NotNull UUID brandId,
            @Size(max = 20) List<@NotNull UUID> categoryIds,
            @NotNull ProductStatus status) {
    }

    public record VariantUpsert(
            @NotBlank @Size(max = 64) @Pattern(regexp = "^[A-Za-z0-9._-]+$", message = "may only contain letters, digits, '.', '_' and '-'") String sku,
            @Size(max = 20) String size,
            @Size(max = 40) String color,
            @NotNull @Min(0) @Max(100_000_000) Long priceCents,
            @Min(0) @Max(100_000_000) Long compareAtPriceCents,
            @Min(0) @Max(1_000_000) Integer onHand) {
    }

    public record CategoryUpsert(
            @NotBlank @Size(max = 80) String name,
            @Size(max = 80) @Pattern(regexp = SLUG, message = "may only contain a-z, 0-9 and dashes") String slug,
            UUID parentId) {
    }

    public record BrandUpsert(
            @NotBlank @Size(max = 80) String name,
            @Size(max = 80) @Pattern(regexp = SLUG, message = "may only contain a-z, 0-9 and dashes") String slug) {
    }
}
