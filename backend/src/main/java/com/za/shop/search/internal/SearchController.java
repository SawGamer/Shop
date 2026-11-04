package com.za.shop.search.internal;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

@RestController
@Validated
@Tag(name = "Search")
class SearchController {

    private final ProductSearchService search;
    private final ProductIndexer indexer;

    SearchController(ProductSearchService search, ProductIndexer indexer) {
        this.search = search;
        this.indexer = indexer;
    }

    @GetMapping("/api/v1/products")
    ResponseEntity<ProductSearchService.SearchResponse> products(
            @RequestParam(required = false) @Size(max = 200) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) List<String> brand,
            @RequestParam(required = false) List<String> size,
            @RequestParam(required = false) List<String> color,
            @RequestParam(required = false) @Min(0) Long minPrice,
            @RequestParam(required = false) @Min(0) Long maxPrice,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(required = false) Boolean onSale,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        var result = search.search(new ProductSearchService.Query(q, category, brand, size, color, minPrice, maxPrice,
                inStock, onSale, sort, page, pageSize));
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(15)).cachePublic()
                .staleWhileRevalidate(Duration.ofMinutes(1))).body(result);
    }

    @PostMapping("/api/v1/admin/search/reindex")
    ResponseEntity<Map<String, Integer>> reindex() {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("indexed", indexer.reindexAll()));
    }
}
