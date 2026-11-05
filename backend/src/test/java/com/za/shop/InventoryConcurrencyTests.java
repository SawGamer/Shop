package com.za.shop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;

import com.za.shop.inventory.InsufficientStockException;
import com.za.shop.inventory.InventoryService;
import com.za.shop.inventory.StockLevel;

/** The "last pair of shoes" problem: many customers check out the same scarce item at the same moment. */
class InventoryConcurrencyTests extends IntegrationTest {

    @Autowired
    InventoryService inventory;

    @Autowired
    TransactionTemplate tx;

    @Test
    void concurrentCheckoutsNeverOversell() throws Exception {
        UUID variant = UUID.randomUUID();
        tx.executeWithoutResult(s -> inventory.initialize(variant, 5));

        int buyers = 40;
        CountDownLatch start = new CountDownLatch(1);
        List<UUID> orders = new ArrayList<>();
        List<Future<Boolean>> results = new ArrayList<>();
        try (ExecutorService pool = Executors.newFixedThreadPool(16)) {
            for (int i = 0; i < buyers; i++) {
                UUID orderId = UUID.randomUUID();
                orders.add(orderId);
                results.add(pool.submit(() -> {
                    start.await();
                    try {
                        tx.executeWithoutResult(s -> inventory.reserve(orderId, Map.of(variant, 1)));
                        return true;
                    }
                    catch (InsufficientStockException e) {
                        return false;
                    }
                }));
            }
            start.countDown();
            int succeeded = 0;
            for (Future<Boolean> result : results) {
                succeeded += result.get() ? 1 : 0;
            }
            assertThat(succeeded).isEqualTo(5);
        }

        StockLevel level = inventory.level(variant);
        assertThat(level.onHand()).isEqualTo(5);
        assertThat(level.reserved()).isEqualTo(5);
        assertThat(level.available()).isZero();

        // Releasing every order (also the failed ones, which reserved nothing) restores exactly the stock.
        orders.forEach(inventory::release);
        assertThat(inventory.level(variant)).isEqualTo(StockLevel.of(variant, 5, 0));
    }

    @Test
    void multiLineReservationsAreAllOrNothing() {
        UUID plenty = UUID.randomUUID();
        UUID scarce = UUID.randomUUID();
        tx.executeWithoutResult(s -> {
            inventory.initialize(plenty, 10);
            inventory.initialize(scarce, 1);
        });
        UUID order = UUID.randomUUID();
        assertThatThrownBy(() -> tx.executeWithoutResult(s -> inventory.reserve(order, Map.of(plenty, 3, scarce, 2))))
                .isInstanceOfSatisfying(InsufficientStockException.class, e -> assertThat(e.shortages())
                        .singleElement().satisfies(sh -> {
                            assertThat(sh.variantId()).isEqualTo(scarce);
                            assertThat(sh.available()).isEqualTo(1);
                        }));
        assertThat(inventory.level(plenty).reserved()).isZero(); // rolled back
        inventory.commit(order); // no-op: nothing was reserved
        assertThat(inventory.level(plenty).onHand()).isEqualTo(10);
    }
}
