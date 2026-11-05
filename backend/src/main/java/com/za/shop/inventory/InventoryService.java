package com.za.shop.inventory;

import java.sql.Timestamp;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.shared.ApiException;

/**
 * Stock per variant. Every mutation is a single conditional SQL statement, so correctness under
 * concurrency is guaranteed by the database (row locks + check constraints) rather than by
 * application locks — which is what lets any number of API instances run side by side.
 */
@Service
public class InventoryService {

    private final JdbcClient jdbc;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    InventoryService(JdbcClient jdbc, ApplicationEventPublisher events, Clock clock) {
        this.jdbc = jdbc;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public StockLevel initialize(UUID variantId, int onHand) {
        requireNonNegative(onHand);
        jdbc.sql("""
                insert into inventory_items (variant_id, on_hand, reserved, updated_at)
                values (:id, :onHand, 0, :now) on conflict (variant_id) do nothing""")
                .param("id", variantId).param("onHand", onHand).param("now", now())
                .update();
        events.publishEvent(new StockChanged(Set.of(variantId)));
        return level(variantId);
    }

    /** Sets the physical stock count. It can never drop below what is reserved by open orders. */
    @Transactional
    public StockLevel setOnHand(UUID variantId, int onHand) {
        requireNonNegative(onHand);
        int updated = jdbc.sql("""
                update inventory_items set on_hand = :onHand, updated_at = :now
                where variant_id = :id and reserved <= :onHand""")
                .param("id", variantId).param("onHand", onHand).param("now", now())
                .update();
        if (updated == 0) {
            StockLevel current = find(variantId).orElseThrow(() -> ApiException.notFound("Variant stock"));
            throw ApiException.conflict("CONFLICT",
                    current.reserved() + " units are reserved by open orders; stock cannot go below that");
        }
        events.publishEvent(new StockChanged(Set.of(variantId)));
        return level(variantId);
    }

    @Transactional
    public void remove(UUID variantId) {
        int deleted = jdbc.sql("delete from inventory_items where variant_id = :id and reserved = 0")
                .param("id", variantId).update();
        if (deleted == 0 && find(variantId).isPresent()) {
            throw ApiException.conflict("CONFLICT", "This variant has stock reserved by open orders");
        }
    }

    @Transactional(readOnly = true)
    public StockLevel level(UUID variantId) {
        return find(variantId).orElseGet(() -> StockLevel.none(variantId));
    }

    @Transactional(readOnly = true)
    public Map<UUID, StockLevel> levels(Collection<UUID> variantIds) {
        Map<UUID, StockLevel> result = new HashMap<>();
        if (variantIds.isEmpty()) {
            return result;
        }
        jdbc.sql("select variant_id, on_hand, reserved from inventory_items where variant_id in (:ids)")
                .param("ids", Set.copyOf(variantIds))
                .query((rs, n) -> StockLevel.of(rs.getObject(1, UUID.class), rs.getInt(2), rs.getInt(3)))
                .list()
                .forEach(level -> result.put(level.variantId(), level));
        variantIds.forEach(id -> result.putIfAbsent(id, StockLevel.none(id)));
        return result;
    }

    /**
     * Reserves stock for an order inside the caller's transaction. Either every line is reserved
     * or an {@link InsufficientStockException} is thrown and the caller's transaction rolls back.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void reserve(UUID orderId, Map<UUID, Integer> quantities) {
        // Lock rows in a stable order so concurrent checkouts of overlapping carts can't deadlock.
        Map<UUID, Integer> sorted = new TreeMap<>(quantities);
        List<InsufficientStockException.Shortage> shortages = new ArrayList<>();
        for (Map.Entry<UUID, Integer> line : sorted.entrySet()) {
            int updated = jdbc.sql("""
                    update inventory_items set reserved = reserved + :qty, updated_at = :now
                    where variant_id = :id and on_hand - reserved >= :qty""")
                    .param("id", line.getKey()).param("qty", line.getValue()).param("now", now())
                    .update();
            if (updated == 0) {
                shortages.add(new InsufficientStockException.Shortage(line.getKey(), line.getValue(),
                        level(line.getKey()).available()));
            }
        }
        if (!shortages.isEmpty()) {
            throw new InsufficientStockException(shortages);
        }
        for (Map.Entry<UUID, Integer> line : sorted.entrySet()) {
            jdbc.sql("""
                    insert into stock_reservations (id, order_id, variant_id, quantity, status, created_at, updated_at)
                    values (:id, :orderId, :variantId, :qty, 'RESERVED', :now, :now)""")
                    .param("id", UUID.randomUUID()).param("orderId", orderId).param("variantId", line.getKey())
                    .param("qty", line.getValue()).param("now", now())
                    .update();
        }
        events.publishEvent(new StockChanged(sorted.keySet()));
    }

    /** The order was paid: reserved units leave the warehouse. Idempotent. */
    @Transactional
    public void commit(UUID orderId) {
        settle(orderId, "COMMITTED", """
                update inventory_items set on_hand = on_hand - :qty, reserved = reserved - :qty, updated_at = :now
                where variant_id = :id""");
    }

    /** The order was cancelled or expired: reserved units become available again. Idempotent. */
    @Transactional
    public void release(UUID orderId) {
        settle(orderId, "RELEASED", """
                update inventory_items set reserved = reserved - :qty, updated_at = :now where variant_id = :id""");
    }

    @Transactional(readOnly = true)
    public List<StockLevel> lowStock(int threshold, int limit) {
        return jdbc.sql("""
                select variant_id, on_hand, reserved from inventory_items
                where on_hand - reserved <= :threshold order by on_hand - reserved, variant_id limit :limit""")
                .param("threshold", threshold).param("limit", limit)
                .query((rs, n) -> StockLevel.of(rs.getObject(1, UUID.class), rs.getInt(2), rs.getInt(3)))
                .list();
    }

    private void settle(UUID orderId, String targetStatus, String inventoryUpdate) {
        record Reserved(UUID variantId, int quantity) {
        }
        List<Reserved> lines = jdbc.sql("""
                update stock_reservations set status = :status, updated_at = :now
                where order_id = :orderId and status = 'RESERVED'
                returning variant_id, quantity""")
                .param("status", targetStatus).param("orderId", orderId).param("now", now())
                .query((rs, n) -> new Reserved(rs.getObject(1, UUID.class), rs.getInt(2)))
                .list();
        Set<UUID> changed = new LinkedHashSet<>();
        lines.stream().sorted((a, b) -> a.variantId().compareTo(b.variantId())).forEach(line -> {
            jdbc.sql(inventoryUpdate).param("id", line.variantId()).param("qty", line.quantity())
                    .param("now", now()).update();
            changed.add(line.variantId());
        });
        if (!changed.isEmpty()) {
            events.publishEvent(new StockChanged(changed));
        }
    }

    private java.util.Optional<StockLevel> find(UUID variantId) {
        return jdbc.sql("select variant_id, on_hand, reserved from inventory_items where variant_id = :id")
                .param("id", variantId)
                .query((rs, n) -> StockLevel.of(rs.getObject(1, UUID.class), rs.getInt(2), rs.getInt(3)))
                .optional();
    }

    private Timestamp now() {
        return Timestamp.from(clock.instant());
    }

    private static void requireNonNegative(int onHand) {
        if (onHand < 0 || onHand > 1_000_000) {
            throw ApiException.badRequest("VALIDATION_FAILED", "Stock must be between 0 and 1,000,000");
        }
    }
}
