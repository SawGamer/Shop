package com.za.shop.orders;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.orders.internal.Order;
import com.za.shop.orders.internal.OrderRepository;
import com.za.shop.shared.Money;

/** Read-only order figures for the back office. */
@Service
@Transactional(readOnly = true)
public class OrderStatistics {

    private static final Set<OrderStatus> PAID = EnumSet.of(OrderStatus.PAID, OrderStatus.SHIPPED,
            OrderStatus.DELIVERED);

    public record Totals(long revenueCents, long orders) {
    }

    private final OrderRepository orders;

    OrderStatistics(OrderRepository orders) {
        this.orders = orders;
    }

    public Totals paidSince(Instant since) {
        return new Totals(orders.revenueSince(since, PAID), orders.paidOrdersSince(since, PAID));
    }

    public long count(OrderStatus status) {
        return orders.countByStatus(status);
    }

    public List<OrderSummaryView> recent(int limit) {
        return orders.findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"))).stream()
                .map(OrderStatistics::summary).toList();
    }

    private static OrderSummaryView summary(Order o) {
        return new OrderSummaryView(o.getId(), o.getOrderNumber(), o.getStatus(),
                Money.of(o.getTotalCents(), o.getCurrency()), o.itemCount(), o.getCreatedAt(), o.getCustomerEmail());
    }
}
