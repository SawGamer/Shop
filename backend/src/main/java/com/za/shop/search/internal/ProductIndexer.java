package com.za.shop.search.internal;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

import com.za.shop.catalog.CatalogLookup;
import com.za.shop.catalog.ProductChanged;
import com.za.shop.catalog.ProductIndexData;
import com.za.shop.inventory.InventoryService;
import com.za.shop.inventory.StockChanged;
import com.za.shop.inventory.StockLevel;

/**
 * Keeps the search index in sync with the catalog and stock. Updates arrive as persisted domain
 * events, so an index update is retried if Meilisearch was down — the index is eventually consistent
 * with the database, which is the source of truth.
 */
@Component
class ProductIndexer {

    private static final Logger log = LoggerFactory.getLogger(ProductIndexer.class);
    private static final int BATCH = 500;

    private final MeilisearchClient meili;
    private final CatalogLookup catalog;
    private final InventoryService inventory;

    ProductIndexer(MeilisearchClient meili, CatalogLookup catalog, InventoryService inventory) {
        this.meili = meili;
        this.catalog = catalog;
        this.inventory = inventory;
    }

    @ApplicationModuleListener
    void on(ProductChanged event) {
        reindex(event.productId());
    }

    @ApplicationModuleListener
    void on(StockChanged event) {
        catalog.productIdsOfVariants(event.variantIds()).forEach(this::reindex);
    }

    @EventListener(ApplicationReadyEvent.class)
    void initialize() {
        try {
            long count = meili.documentCount(meili.index());
            if (count < 0) {
                meili.await(meili.createIndex(meili.index()), Duration.ofSeconds(30));
            }
            meili.await(meili.configure(meili.index()), Duration.ofSeconds(60));
            if (count <= 0) {
                log.info("Search index is empty, building it");
                reindexAll();
            }
        }
        catch (RuntimeException e) {
            log.error("Search engine unavailable at startup; search will fail until it is reachable: {}",
                    e.getMessage());
        }
    }

    void reindex(UUID productId) {
        catalog.productForIndex(productId).ifPresentOrElse(
                data -> meili.upsert(meili.index(), documents(List.of(data))),
                () -> meili.delete(meili.index(), productId.toString()));
    }

    /**
     * Zero-downtime rebuild: fill a fresh index, then atomically swap it with the live one.
     */
    int reindexAll() {
        String live = meili.index();
        String fresh = live + "_rebuild_" + System.currentTimeMillis();
        meili.await(meili.createIndex(fresh), Duration.ofSeconds(30));
        meili.await(meili.configure(fresh), Duration.ofSeconds(60));
        int total = 0;
        MeilisearchClient.Task last = null;
        for (int page = 0;; page++) {
            List<UUID> ids = catalog.activeProductIds(page, BATCH);
            if (ids.isEmpty()) {
                break;
            }
            List<ProductIndexData> batch = new ArrayList<>();
            ids.forEach(id -> catalog.productForIndex(id).ifPresent(batch::add));
            if (!batch.isEmpty()) {
                last = meili.upsert(fresh, documents(batch));
                total += batch.size();
            }
        }
        if (last != null) {
            meili.await(last, Duration.ofMinutes(5));
        }
        if (meili.documentCount(live) < 0) {
            meili.await(meili.createIndex(live), Duration.ofSeconds(30));
        }
        meili.await(meili.swap(live, fresh), Duration.ofSeconds(60));
        meili.deleteIndex(fresh);
        log.info("Rebuilt search index with {} products", total);
        return total;
    }

    private List<ProductDocument> documents(List<ProductIndexData> products) {
        List<UUID> variantIds = products.stream().flatMap(p -> p.variantIds().stream()).toList();
        Map<UUID, StockLevel> stock = inventory.levels(variantIds);
        return products.stream().map(p -> new ProductDocument(p.id().toString(), p.slug(), p.name(),
                p.description(), p.brandId().toString(), p.brandSlug(), p.brandName(), p.categorySlugs(), p.sizes(),
                p.colors(), p.minPriceCents(), p.compareAtPriceCents(), p.compareAtPriceCents() != null,
                p.variantIds().stream().anyMatch(id -> stock.get(id).available() > 0), p.imageUrl(),
                p.createdAt().getEpochSecond(), p.specFilters(), p.highlights(), p.dealEndsAt() != null,
                p.dealEndsAt() == null ? null : p.dealEndsAt().getEpochSecond())).toList();
    }
}
