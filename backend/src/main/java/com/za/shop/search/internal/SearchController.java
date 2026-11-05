package com.za.shop.search.internal;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.za.shop.shared.ApiException;

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
            @RequestParam(required = false) Boolean deal,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            @RequestParam MultiValueMap<String, String> allParams) {
        var result = search.search(new ProductSearchService.Query(q, category, brand, size, color, minPrice, maxPrice,
                inStock, onSale, deal, specParams(allParams), sort, page, pageSize));
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(15)).cachePublic()
                .staleWhileRevalidate(Duration.ofMinutes(1))).body(result);
    }

    private static final Pattern SPEC_KEY = Pattern.compile("^[a-z0-9_]{1,60}$");

    /** Collects {@code spec.<key>=value} parameters; keys are validated because they end up in filters. */
    private static Map<String, List<String>> specParams(MultiValueMap<String, String> params) {
        Map<String, List<String>> specs = new LinkedHashMap<>();
        params.forEach((name, values) -> {
            if (!name.startsWith("spec.")) {
                return;
            }
            String key = name.substring("spec.".length());
            if (!SPEC_KEY.matcher(key).matches() || specs.size() >= 10) {
                throw ApiException.badRequest("VALIDATION_FAILED", "Invalid spec filter '" + name + "'");
            }
            specs.put(key, values.stream().limit(20).toList());
        });
        return specs;
    }

    @PostMapping("/api/v1/admin/search/reindex")
    ResponseEntity<Map<String, Integer>> reindex() {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("indexed", indexer.reindexAll()));
    }
}
