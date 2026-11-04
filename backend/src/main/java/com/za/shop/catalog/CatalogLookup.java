package com.za.shop.catalog;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.catalog.internal.Brand;
import com.za.shop.catalog.internal.BrandRepository;
import com.za.shop.catalog.internal.Category;
import com.za.shop.catalog.internal.CategoryRepository;
import com.za.shop.catalog.internal.Product;
import com.za.shop.catalog.internal.ProductRepository;
import com.za.shop.catalog.internal.ProductVariant;
import com.za.shop.catalog.internal.ProductVariantRepository;
import com.za.shop.catalog.internal.Sizes;

/** Read-only catalog API for other modules. Returns plain records, never entities. */
@Service
@Transactional(readOnly = true)
public class CatalogLookup {

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final BrandRepository brands;
    private final CategoryRepository categories;

    CatalogLookup(ProductRepository products, ProductVariantRepository variants, BrandRepository brands,
            CategoryRepository categories) {
        this.products = products;
        this.variants = variants;
        this.brands = brands;
        this.categories = categories;
    }

    public Map<UUID, VariantView> variants(Collection<UUID> variantIds) {
        if (variantIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, VariantView> result = new HashMap<>();
        for (ProductVariant v : variants.findWithProduct(Set.copyOf(variantIds))) {
            Product p = v.getProduct();
            String image = p.getImages().isEmpty() ? null : p.getImages().getFirst().getUrl();
            result.put(v.getId(), new VariantView(v.getId(), p.getId(), p.getSlug(), p.getName(), v.getSku(),
                    v.getSize(), v.getColor(), v.getPriceCents(), v.effectiveCompareAtCents(), image, p.isPublished()));
        }
        return result;
    }

    public Optional<VariantView> variant(UUID variantId) {
        return Optional.ofNullable(variants(List.of(variantId)).get(variantId));
    }

    /** Empty when the product does not exist or is not published (so it must be removed from the index). */
    public Optional<ProductIndexData> productForIndex(UUID productId) {
        return products.findById(productId).filter(Product::isPublished).map(p -> {
            Map<UUID, Category> allCategories = categories.findAll().stream()
                    .collect(Collectors.toMap(Category::getId, Function.identity()));
            Set<String> categorySlugs = new LinkedHashSet<>();
            for (Category category : p.getCategories()) {
                Category current = category;
                int guard = 0;
                while (current != null && guard++ < 20) {
                    categorySlugs.add(current.getSlug());
                    current = current.getParentId() == null ? null : allCategories.get(current.getParentId());
                }
            }
            ProductVariant cheapest = p.getVariants().stream()
                    .min(java.util.Comparator.comparingLong(ProductVariant::getPriceCents)).orElseThrow();
            List<String> sizes = p.getVariants().stream().map(ProductVariant::getSize).filter(s -> s != null)
                    .distinct().sorted(Sizes.ORDER).toList();
            List<String> colors = p.getVariants().stream().map(ProductVariant::getColor).filter(c -> c != null)
                    .distinct().toList();
            Brand brand = p.getBrand();
            return new ProductIndexData(p.getId(), p.getSlug(), p.getName(), p.getDescription(), brand.getId(),
                    brand.getSlug(), brand.getName(), new ArrayList<>(categorySlugs), sizes, colors,
                    cheapest.getPriceCents(), cheapest.effectiveCompareAtCents(),
                    p.getImages().isEmpty() ? null : p.getImages().getFirst().getUrl(),
                    p.getVariants().stream().map(ProductVariant::getId).toList(), p.getCreatedAt());
        });
    }

    /** Pages through the ids of all active products (for a full search reindex). */
    public List<UUID> activeProductIds(int page, int pageSize) {
        Page<UUID> ids = products.findActiveIds(PageRequest.of(page, pageSize));
        return ids.getContent();
    }

    public Set<UUID> productIdsOfVariants(Collection<UUID> variantIds) {
        return variantIds.isEmpty() ? Set.of() : Set.copyOf(variants.findProductIds(Set.copyOf(variantIds)));
    }

    public Map<String, String> brandNamesBySlug() {
        return brands.findAll().stream().collect(Collectors.toMap(Brand::getSlug, Brand::getName));
    }

    public Map<String, String> categoryNamesBySlug() {
        return categories.findAll().stream().collect(Collectors.toMap(Category::getSlug, Category::getName));
    }
}
