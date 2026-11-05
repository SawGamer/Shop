package com.za.shop.catalog.internal;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.catalog.ProductChanged;

/**
 * A deal changes a product's price the moment it starts or ends, without anybody editing the product.
 * This job notices those moments and republishes the product so the search index shows the right price.
 * (Carts and orders read prices from the catalog directly, so they are always exact.)
 */
@Component
class DealBoundaryJob {

    private static final Logger log = LoggerFactory.getLogger(DealBoundaryJob.class);

    private final ProductRepository products;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private volatile Instant checkedUntil;

    DealBoundaryJob(ProductRepository products, ApplicationEventPublisher events, Clock clock) {
        this.products = products;
        this.events = events;
        this.clock = clock;
        // Also catches boundaries crossed while the application was down.
        this.checkedUntil = clock.instant().minus(Duration.ofMinutes(10));
    }

    @Scheduled(fixedDelayString = "${shop.catalog.deal-check-interval-ms:30000}", initialDelay = 20_000)
    public void run() {
        Instant now = clock.instant();
        publishBoundariesBetween(checkedUntil, now);
        checkedUntil = now;
    }

    /** Republishes every product whose deal started or ended in {@code (from, to]}. */
    @Transactional
    public List<UUID> publishBoundariesBetween(Instant from, Instant to) {
        List<UUID> ids = products.findIdsWithDealBoundaryBetween(from, to);
        ids.forEach(id -> events.publishEvent(new ProductChanged(id)));
        if (!ids.isEmpty()) {
            log.info("{} product(s) had a deal start or end; refreshing their search entries", ids.size());
        }
        return ids;
    }
}
