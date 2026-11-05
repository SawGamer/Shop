package com.za.shop.catalog;

import java.time.Clock;
import java.time.Instant;
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
import com.za.shop.catalog.internal.Deal;
import com.za.shop.catalog.internal.CategoryRepository;
import com.za.shop.catalog.internal.Pricing;
import com.za.shop.catalog.internal.Product;
import com.za.shop.catalog.internal.ProductRepository;
import com.za.shop.catalog.internal.ProductSpec;
import com.za.shop.catalog.internal.ProductVariant;
import com.za.shop.catalog.internal.ProductVariantRepository;
import com.za.shop.shared.OptionOrder;

/** Read-only catalog API for other modules. Returns plain records, never entities. */
@Service
@Transactional(readOnly = true)
public class CatalogLookup {

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final BrandRepository brands;
    private final CategoryRepository categories;
    private final Clock clock;

    CatalogLookup(ProductRepository products, ProductVariantRepository variants, BrandRepository brands,
            CategoryRepository categories, Clock clock) {
        this.products = products;
        this.variants = variants;
        this.brands = brands;
        this.categories = categories;
        this.clock = clock;
    }

    public Map<UUID, VariantView> variants(Collection<UUID> variantIds) {
        if (variantIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, VariantView> result = new HashMap<>();
        Instant now = clock.instant();
        for (ProductVariant v : variants.findWithProduct(Set.copyOf(variantIds))) {
            Product p = v.getProduct();
            String image = p.getImages().isEmpty() ? null : p.getImages().getFirst().getUrl();
            // Carts and orders are priced from here, so a running deal applies at checkout too.
            Pricing.Effective price = Pricing.of(v, p.runningDeal(now));
            result.put(v.getId(), new VariantView(v.getId(), p.getId(), p.getSlug(), p.getName(), v.getSku(),
                    v.getSize(), v.getColor(), price.priceCents(), price.compareAtCents(), image, p.isPublished()));
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
            Optional<Deal> running = p.runningDeal(clock.instant());
            ProductVariant cheapest = p.getVariants().stream()
                    .min(java.util.Comparator.comparingLong(ProductVariant::getPriceCents)).orElseThrow();
            Pricing.Effective cheapestPrice = Pricing.of(cheapest, running);
            List<ProductSpec> filterable = p.getSpecs().stream().filter(ProductSpec::isFilterable).toList();
            List<String> sizes = OptionOrder.arrange(p.getVariants().stream().map(ProductVariant::getSize).filter(s -> s != null)
                    .distinct().toList());
            List<String> colors = p.getVariants().stream().map(ProductVariant::getColor).filter(c -> c != null)
                    .distinct().toList();
            Brand brand = p.getBrand();
            return new ProductIndexData(p.getId(), p.getSlug(), p.getName(), p.getDescription(), brand.getId(),
                    brand.getSlug(), brand.getName(), new ArrayList<>(categorySlugs), sizes, colors,
                    cheapestPrice.priceCents(), cheapestPrice.compareAtCents(),
                    p.getImages().isEmpty() ? null : p.getImages().getFirst().getUrl(),
                    p.getVariants().stream().map(ProductVariant::getId).toList(), p.getCreatedAt(),
                    filterable.stream().map(sp -> sp.getSpecKey() + ":" + sp.getSpecValue()).toList(),
                    filterable.stream().limit(3).map(ProductSpec::highlight).toList(),
                    running.map(Deal::endsAt).orElse(null));
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

    /** Label of every filterable spec key (for search facet titles). */
    public Map<String, String> specLabelsByKey() {
        return products.findFilterableSpecLabels().stream().collect(Collectors.toMap(row -> (String) row[0],
                row -> (String) row[1], (a, b) -> a));
    }

    public Map<String, String> categoryNamesBySlug() {
        return categories.findAll().stream().collect(Collectors.toMap(Category::getSlug, Category::getName));
    }
}
