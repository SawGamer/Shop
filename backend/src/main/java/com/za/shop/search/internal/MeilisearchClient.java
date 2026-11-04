package com.za.shop.search.internal;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/** Thin client for the parts of the Meilisearch HTTP API the shop uses. */
@Component
class MeilisearchClient {

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Task(long taskUid) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TaskStatus(long uid, String status, Map<String, Object> error) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Stats(long numberOfDocuments) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record SearchQuery(String indexUid, String q, List<Object> filter, List<String> facets, List<String> sort,
            Integer page, Integer hitsPerPage) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SearchResult(List<ProductDocument> hits, Map<String, Map<String, Integer>> facetDistribution,
            Integer totalHits, Integer totalPages, Integer page, Integer hitsPerPage) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record MultiSearchResult(List<SearchResult> results) {
    }

    private final RestClient http;
    private final SearchProperties.Meilisearch config;

    MeilisearchClient(SearchProperties properties) {
        this.config = properties.meilisearch();
        // java.net.http client: supports PATCH (HttpURLConnection does not) and keeps connections alive.
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                java.net.http.HttpClient.newBuilder().connectTimeout(config.timeout()).build());
        factory.setReadTimeout(config.timeout());
        RestClient.Builder builder = RestClient.builder().baseUrl(config.url()).requestFactory(factory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
        if (config.apiKey() != null && !config.apiKey().isBlank()) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + config.apiKey());
        }
        this.http = builder.build();
    }

    String index() {
        return config.index();
    }

    Task configure(String index) {
        Map<String, Object> settings = Map.of(
                "searchableAttributes", List.of("name", "brandName", "categories", "colors", "description"),
                "filterableAttributes", List.of("brand", "categories", "sizes", "colors", "price", "inStock",
                        "onSale"),
                "sortableAttributes", List.of("price", "createdAt"),
                "faceting", Map.of("maxValuesPerFacet", 200),
                "pagination", Map.of("maxTotalHits", 10_000));
        return http.patch().uri("/indexes/{index}/settings", index).body(settings).retrieve().body(Task.class);
    }

    Task upsert(String index, List<ProductDocument> documents) {
        return http.post().uri("/indexes/{index}/documents?primaryKey=id", index).body(documents).retrieve()
                .body(Task.class);
    }

    Task delete(String index, String id) {
        return http.delete().uri("/indexes/{index}/documents/{id}", index, id).retrieve().body(Task.class);
    }

    Task swap(String a, String b) {
        return http.post().uri("/swap-indexes").body(List.of(Map.of("indexes", List.of(a, b)))).retrieve()
                .body(Task.class);
    }

    Task deleteIndex(String index) {
        return http.delete().uri("/indexes/{index}", index).retrieve().body(Task.class);
    }

    Task createIndex(String index) {
        return http.post().uri("/indexes").body(Map.of("uid", index, "primaryKey", "id")).retrieve()
                .body(Task.class);
    }

    long documentCount(String index) {
        try {
            Stats stats = http.get().uri("/indexes/{index}/stats", index).retrieve().body(Stats.class);
            return stats == null ? 0 : stats.numberOfDocuments();
        }
        catch (HttpClientErrorException.NotFound e) {
            return -1;
        }
    }

    MultiSearchResult multiSearch(List<SearchQuery> queries) {
        return http.post().uri("/multi-search").body(Map.of("queries", queries)).retrieve()
                .body(MultiSearchResult.class);
    }

    /** Meilisearch applies writes asynchronously; wait for a task when ordering matters. */
    TaskStatus await(Task task, Duration timeout) {
        Instant deadline = Instant.now().plus(timeout);
        while (true) {
            TaskStatus status = http.get().uri("/tasks/{uid}", task.taskUid()).retrieve().body(TaskStatus.class);
            if (status != null && ("succeeded".equals(status.status()) || "failed".equals(status.status())
                    || "canceled".equals(status.status()))) {
                return status;
            }
            if (Instant.now().isAfter(deadline)) {
                throw new IllegalStateException("Meilisearch task " + task.taskUid() + " did not finish in time");
            }
            try {
                Thread.sleep(50);
            }
            catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(e);
            }
        }
    }
}
