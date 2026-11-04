package com.za.shop.catalog.internal;

import java.time.Duration;
import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.za.shop.catalog.internal.CatalogDtos.BrandDto;
import com.za.shop.catalog.internal.CatalogDtos.CategoryNode;
import com.za.shop.catalog.internal.CatalogDtos.ProductDetailDto;

import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Public, read-only catalog. Responses are cacheable by browsers, the storefront and any CDN in front,
 * which absorbs most read traffic before it reaches the API.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "Catalog")
class CatalogController {

    static final CacheControl PUBLIC_CACHE = CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic()
            .staleWhileRevalidate(Duration.ofMinutes(5));

    private final CatalogQueryService catalog;

    CatalogController(CatalogQueryService catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/categories")
    ResponseEntity<List<CategoryNode>> categories() {
        return ResponseEntity.ok().cacheControl(PUBLIC_CACHE).body(catalog.categoryTree());
    }

    @GetMapping("/brands")
    ResponseEntity<List<BrandDto>> brands() {
        return ResponseEntity.ok().cacheControl(PUBLIC_CACHE).body(catalog.brands());
    }

    @GetMapping("/products/{slug}")
    ResponseEntity<ProductDetailDto> product(@PathVariable String slug) {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(15)).cachePublic()
                .staleWhileRevalidate(Duration.ofMinutes(1))).body(catalog.publishedProduct(slug));
    }
}
