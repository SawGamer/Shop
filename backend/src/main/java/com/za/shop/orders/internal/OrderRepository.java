package com.za.shop.orders.internal;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import com.za.shop.orders.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, UUID>, JpaSpecificationExecutor<Order> {

    Page<Order> findByUserId(UUID userId, Pageable pageable);

    @Query(value = "select nextval('order_number_seq')", nativeQuery = true)
    long nextOrderNumber();

    /**
     * Claims overdue unpaid orders. {@code SKIP LOCKED} lets several API instances run the expiry job
     * at the same time without processing the same order twice or blocking each other.
     */
    @Query(value = """
            select id from orders where status = 'PENDING_PAYMENT' and expires_at < :cutoff
            order by expires_at limit :limit for update skip locked""", nativeQuery = true)
    List<UUID> lockOverdue(Instant cutoff, int limit);

    @Query("""
            select coalesce(sum(o.totalCents), 0) from Order o
            where o.paidAt >= :since and o.status in :statuses""")
    long revenueSince(Instant since, Collection<OrderStatus> statuses);

    @Query("select count(o) from Order o where o.paidAt >= :since and o.status in :statuses")
    long paidOrdersSince(Instant since, Collection<OrderStatus> statuses);

    long countByStatus(OrderStatus status);
}
