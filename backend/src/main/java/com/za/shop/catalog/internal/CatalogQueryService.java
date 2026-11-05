package com.za.shop.catalog.internal;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.catalog.internal.CatalogDtos.BrandDto;
import com.za.shop.catalog.internal.CatalogDtos.CategoryNode;
import com.za.shop.catalog.internal.CatalogDtos.ProductDetailDto;
import com.za.shop.shared.ApiException;

@Service
@Transactional(readOnly = true)
class CatalogQueryService {

    private final ProductRepository products;
    private final BrandRepository brands;
    private final CategoryRepository categories;
    private final CatalogMapper mapper;

    CatalogQueryService(ProductRepository products, BrandRepository brands, CategoryRepository categories,
            CatalogMapper mapper) {
        this.products = products;
        this.brands = brands;
        this.categories = categories;
        this.mapper = mapper;
    }

    ProductDetailDto publishedProduct(String slug) {
        return products.findBySlug(slug).filter(Product::isPublished).map(mapper::detail)
                .orElseThrow(() -> ApiException.notFound("Product"));
    }

    List<BrandDto> brands() {
        return brands.findAll().stream().sorted(Comparator.comparing(Brand::getName, String.CASE_INSENSITIVE_ORDER))
                .map(BrandDto::of).toList();
    }

    /** The whole tree, assembled in memory from one query. */
    List<CategoryNode> categoryTree() {
        List<Category> all = categories.findAll();
        Map<UUID, List<Category>> byParent = new HashMap<>();
        all.forEach(c -> byParent.computeIfAbsent(c.getParentId(), k -> new ArrayList<>()).add(c));
        return children(null, byParent);
    }

    List<CategoryNode> flatCategories() {
        return categories.findAll().stream().sorted(ORDER)
                .map(c -> new CategoryNode(c.getId(), c.getSlug(), c.getName(), c.getParentId(), List.of())).toList();
    }

    private static final Comparator<Category> ORDER = Comparator.comparingInt(Category::getPosition)
            .thenComparing(Category::getName, String.CASE_INSENSITIVE_ORDER);

    private static List<CategoryNode> children(UUID parentId, Map<UUID, List<Category>> byParent) {
        return byParent.getOrDefault(parentId, List.of()).stream().sorted(ORDER)
                .map(c -> new CategoryNode(c.getId(), c.getSlug(), c.getName(), c.getParentId(),
                        children(c.getId(), byParent)))
                .toList();
    }
}
