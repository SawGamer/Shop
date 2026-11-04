package com.za.shop.orders.internal;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.cart.CartView;
import com.za.shop.inventory.InventoryService;
import com.za.shop.inventory.StockLevel;
import com.za.shop.orders.OrderEvents;
import com.za.shop.orders.OrderStatus;
import com.za.shop.shared.ApiException;
import com.za.shop.shared.CurrentUser.AuthenticatedUser;

/** All order state changes go through here, each in one transaction together with its stock effect. */
@Service
@Transactional
class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    static final Duration PAYMENT_WINDOW = Duration.ofMinutes(30);

    private final OrderRepository orders;
    private final InventoryService inventory;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    OrderService(OrderRepository orders, InventoryService inventory, ApplicationEventPublisher events, Clock clock) {
        this.orders = orders;
        this.inventory = inventory;
        this.events = events;
        this.clock = clock;
    }

    /** Creates the order from server-side prices and reserves its stock; all or nothing. */
    Order place(AuthenticatedUser customer, ShippingAddress address, CartView cart) {
        Instant now = clock.instant();
        Order order = new Order("ZA-" + orders.nextOrderNumber(), customer.id(), customer.email(),
                cart.subtotal().currency(), address, cart.shipping().cents(), now, now.plus(PAYMENT_WINDOW));
        for (CartView.Item item : cart.items()) {
            order.addLine(item.variantId(), item.productId(), item.productSlug(), item.productName(), item.sku(),
                    item.size(), item.color(), item.imageUrl(), item.unitPrice().cents(), item.quantity());
        }
        orders.save(order);
        inventory.reserve(order.getId(), quantities(order));
        return order;
    }

    void attachPayment(UUID orderId, UUID paymentSessionId, String paymentUrl) {
        find(orderId).attachPayment(paymentSessionId, paymentUrl, clock.instant());
    }

    /**
     * @return the order if it became paid now (false for duplicates)
     */
    Optional<Order> markPaid(UUID orderId) {
        Order order = orders.findById(orderId).orElse(null);
        if (order == null) {
            log.error("Payment received for unknown order {}", orderId);
            return Optional.empty();
        }
        Instant now = clock.instant();
        switch (order.getStatus()) {
            case PENDING_PAYMENT -> {
                order.markPaid(now);
                inventory.commit(orderId);
            }
            case CANCELLED -> {
                // Paid after the payment window closed. Re-take the stock if we still have it.
                Map<UUID, Integer> wanted = quantities(order);
                Map<UUID, StockLevel> stock = inventory.levels(wanted.keySet());
                boolean available = wanted.entrySet().stream()
                        .allMatch(e -> stock.get(e.getKey()).available() >= e.getValue());
                if (!available) {
                    log.error("Order {} was paid after it expired and stock is gone: REFUND REQUIRED",
                            order.getOrderNumber());
                    return Optional.empty();
                }
                inventory.reserve(orderId, wanted);
                order.markPaid(now);
                inventory.commit(orderId);
                log.warn("Order {} was paid after it expired; stock re-reserved", order.getOrderNumber());
            }
            default -> {
                return Optional.empty();
            }
        }
        events.publishEvent(new OrderEvents.OrderPaid(order.getId(), order.getOrderNumber(), order.getUserId(),
                order.getCustomerEmail(), order.getCurrency(), order.getSubtotalCents(), order.getShippingCents(),
                order.getTotalCents(), order.getLines().stream().map(l -> new OrderEvents.Line(l.getProductName(),
                        l.details(), l.getQuantity(), l.getLineTotalCents())).toList()));
        return Optional.of(order);
    }

    /** Cancels an unpaid order and releases its stock. Returns false when it was not pending any more. */
    boolean cancelIfPending(UUID orderId, String reason) {
        Order order = orders.findById(orderId).orElse(null);
        if (order == null || order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            return false;
        }
        order.cancel(clock.instant());
        inventory.release(orderId);
        events.publishEvent(new OrderEvents.OrderCancelled(order.getId(), order.getOrderNumber(),
                order.getCustomerEmail(), reason));
        log.info("Order {} cancelled: {}", order.getOrderNumber(), reason);
        return true;
    }

    Order transition(UUID orderId, OrderStatus target) {
        Order order = find(orderId);
        Instant now = clock.instant();
        switch (target) {
            case SHIPPED -> {
                order.markShipped(now);
                events.publishEvent(new OrderEvents.OrderShipped(order.getId(), order.getOrderNumber(),
                        order.getCustomerEmail()));
            }
            case DELIVERED -> order.markDelivered(now);
            case CANCELLED -> {
                if (!cancelIfPending(orderId, "cancelled by the shop")) {
                    throw ApiException.conflict("INVALID_STATE_TRANSITION",
                            "Only unpaid orders can be cancelled (paid orders need a refund)");
                }
            }
            default -> throw ApiException.badRequest("VALIDATION_FAILED",
                    "status must be SHIPPED, DELIVERED or CANCELLED");
        }
        return order;
    }

    /** Cancels unpaid orders whose payment window closed before {@code cutoff}. */
    List<UUID> expireOverdue(Instant cutoff, int limit) {
        List<UUID> ids = orders.lockOverdue(cutoff, limit);
        ids.forEach(id -> cancelIfPending(id, "payment window expired"));
        return ids;
    }

    private Order find(UUID orderId) {
        return orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order"));
    }

    static Map<UUID, Integer> quantities(Order order) {
        Map<UUID, Integer> quantities = new LinkedHashMap<>();
        order.getLines().forEach(l -> quantities.merge(l.getVariantId(), l.getQuantity(), Integer::sum));
        return quantities;
    }
}
