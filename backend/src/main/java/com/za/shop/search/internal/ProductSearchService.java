package com.za.shop.search.internal;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import com.za.shop.catalog.CatalogLookup;
import com.za.shop.shared.ApiException;
import com.za.shop.shared.Money;
import com.za.shop.shared.OptionOrder;
import com.za.shop.shared.Paging;
import com.za.shop.shared.ShopProperties;

/**
 * Full-text product search with disjunctive faceting: the counts of a facet ignore that facet's own
 * selection, so after ticking "Brand A" the other brands still show how many results they would add.
 * All queries of one page view go to the engine in a single multi-search round trip.
 */
@Service
class ProductSearchService {

    record Query(String q, String category, List<String> brands, List<String> sizes, List<String> colors,
            Long minPrice, Long maxPrice, Boolean inStock, Boolean onSale, String sort, Integer page,
            Integer pageSize) {
    }

    record BrandRef(String id, String slug, String name) {
    }

    record ProductSummary(String id, String slug, String name, BrandRef brand, Money price, Money compareAtPrice,
            String imageUrl, boolean inStock, List<String> sizes, List<String> colors) {
    }

    record FacetValue(String value, String label, int count) {
    }

    record Facets(List<FacetValue> brand, List<FacetValue> category, List<FacetValue> size, List<FacetValue> color) {
    }

    record SearchResponse(List<ProductSummary> items, int page, int pageSize, long totalItems, int totalPages,
            Facets facets) {
    }

    private static final List<String> FACETS = List.of("brand", "categories", "sizes", "colors");

    private final MeilisearchClient meili;
    private final CatalogLookup catalog;
    private final ShopProperties shop;
    private final LabelCache brandLabels;
    private final LabelCache categoryLabels;

    ProductSearchService(MeilisearchClient meili, CatalogLookup catalog, ShopProperties shop) {
        this.meili = meili;
        this.catalog = catalog;
        this.shop = shop;
        this.brandLabels = new LabelCache(catalog::brandNamesBySlug);
        this.categoryLabels = new LabelCache(catalog::categoryNamesBySlug);
    }

    SearchResponse search(Query query) {
        int page = Paging.page(query.page());
        int pageSize = Paging.pageSize(query.pageSize());

        Map<String, List<String>> selected = new LinkedHashMap<>();
        selected.put("brand", clean(query.brands()));
        selected.put("categories", query.category() == null || query.category().isBlank() ? List.of()
                : List.of(query.category().trim()));
        selected.put("sizes", clean(query.sizes()));
        selected.put("colors", clean(query.colors()));

        List<Object> base = new ArrayList<>();
        if (query.minPrice() != null) {
            base.add("price >= " + query.minPrice());
        }
        if (query.maxPrice() != null) {
            base.add("price <= " + query.maxPrice());
        }
        if (Boolean.TRUE.equals(query.inStock())) {
            base.add("inStock = true");
        }
        if (Boolean.TRUE.equals(query.onSale())) {
            base.add("onSale = true");
        }

        String q = query.q() == null ? "" : query.q().trim();
        List<MeilisearchClient.SearchQuery> queries = new ArrayList<>();
        queries.add(new MeilisearchClient.SearchQuery(meili.index(), q, filters(base, selected, null), FACETS,
                sort(query.sort(), !q.isEmpty()), page + 1, pageSize));
        List<String> disjunctive = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : selected.entrySet()) {
            if (!entry.getValue().isEmpty()) {
                disjunctive.add(entry.getKey());
                queries.add(new MeilisearchClient.SearchQuery(meili.index(), q,
                        filters(base, selected, entry.getKey()), List.of(entry.getKey()), null, 1, 0));
            }
        }

        MeilisearchClient.MultiSearchResult result;
        try {
            result = meili.multiSearch(queries);
        }
        catch (RestClientException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SEARCH_UNAVAILABLE",
                    "Search is temporarily unavailable");
        }
        MeilisearchClient.SearchResult main = result.results().getFirst();
        Map<String, Map<String, Integer>> distribution = new LinkedHashMap<>(
                main.facetDistribution() == null ? Map.of() : main.facetDistribution());
        for (int i = 0; i < disjunctive.size(); i++) {
            MeilisearchClient.SearchResult facetResult = result.results().get(i + 1);
            if (facetResult.facetDistribution() != null) {
                String attribute = disjunctive.get(i);
                distribution.put(attribute, facetResult.facetDistribution().getOrDefault(attribute, Map.of()));
            }
        }

        Map<String, String> brands = brandLabels.get();
        Map<String, String> categories = categoryLabels.get();
        Facets facets = new Facets(
                facet(distribution.get("brand"), brands, BY_COUNT),
                facet(distribution.get("categories"), categories, BY_COUNT),
                facet(distribution.get("sizes"), Map.of(), BY_SIZE),
                facet(distribution.get("colors"), Map.of(), BY_COUNT));
        List<ProductSummary> items = main.hits().stream().map(this::summary).toList();
        long total = main.totalHits() == null ? items.size() : main.totalHits();
        return new SearchResponse(items, page, pageSize, total,
                main.totalPages() == null ? 0 : main.totalPages(), facets);
    }

    private ProductSummary summary(ProductDocument d) {
        return new ProductSummary(d.id(), d.slug(), d.name(), new BrandRef(d.brandId(), d.brand(), d.brandName()),
                Money.of(d.price(), shop.currency()),
                d.compareAtPrice() == null ? null : Money.of(d.compareAtPrice(), shop.currency()), d.imageUrl(),
                d.inStock(), d.sizes(), d.colors());
    }

    private static List<Object> filters(List<Object> base, Map<String, List<String>> selected, String except) {
        List<Object> filters = new ArrayList<>(base);
        selected.forEach((attribute, values) -> {
            if (!values.isEmpty() && !attribute.equals(except)) {
                filters.add(attribute + " IN [" + String.join(", ", values.stream().map(v -> quote(v)).toList())
                        + "]");
            }
        });
        return filters;
    }

    private static List<String> sort(String sort, boolean hasQuery) {
        String effective = sort == null || sort.isBlank() ? (hasQuery ? "relevance" : "newest") : sort;
        return switch (effective) {
            case "relevance" -> null;
            case "newest" -> List.of("createdAt:desc");
            case "price_asc" -> List.of("price:asc");
            case "price_desc" -> List.of("price:desc");
            default -> throw ApiException.badRequest("VALIDATION_FAILED",
                    "sort must be one of relevance, newest, price_asc, price_desc");
        };
    }

    private static final Comparator<FacetValue> BY_COUNT = Comparator.comparingInt(FacetValue::count).reversed()
            .thenComparing(FacetValue::label, String.CASE_INSENSITIVE_ORDER);

    private static final Comparator<FacetValue> BY_SIZE = Comparator.comparing(FacetValue::value,
            OptionOrder.COMPARATOR);

    private static List<FacetValue> facet(Map<String, Integer> counts, Map<String, String> labels,
            Comparator<FacetValue> order) {
        if (counts == null) {
            return List.of();
        }
        return counts.entrySet().stream().filter(e -> e.getValue() > 0)
                .map(e -> new FacetValue(e.getKey(), labels.getOrDefault(e.getKey(), e.getKey()), e.getValue()))
                .sorted(order).toList();
    }

    private static List<String> clean(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream().filter(v -> v != null && !v.isBlank()).map(String::trim).distinct().limit(50).toList();
    }

    /** Meilisearch filter string literal. */
    static String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }


    /** Facet labels change rarely; refresh them at most once a minute instead of on every search. */
    private static final class LabelCache {
        private final Supplier<Map<String, String>> loader;
        private volatile Map<String, String> value = Map.of();
        private volatile Instant loadedAt = Instant.EPOCH;

        LabelCache(Supplier<Map<String, String>> loader) {
            this.loader = loader;
        }

        Map<String, String> get() {
            if (loadedAt.plus(Duration.ofSeconds(60)).isBefore(Instant.now())) {
                value = loader.get();
                loadedAt = Instant.now();
            }
            return value;
        }
    }
}
