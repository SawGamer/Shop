package com.za.shop.orders.internal;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.za.shop.cart.CartOwner;
import com.za.shop.cart.CartService;
import com.za.shop.payments.PaymentEvents.PaymentCancelled;
import com.za.shop.payments.PaymentEvents.PaymentExpired;
import com.za.shop.payments.PaymentEvents.PaymentSucceeded;
import com.za.shop.payments.PaymentService;

/** Reacts to payment outcomes and expires orders whose payment window closed. */
@Component
class OrderLifecycle {

    private static final Logger log = LoggerFactory.getLogger(OrderLifecycle.class);
    /** Extra time for a late provider webhook before we give up on an order ourselves. */
    private static final Duration GRACE = Duration.ofMinutes(3);

    private final OrderService orders;
    private final CartService carts;
    private final PaymentService payments;
    private final Clock clock;

    OrderLifecycle(OrderService orders, CartService carts, PaymentService payments, Clock clock) {
        this.orders = orders;
        this.carts = carts;
        this.payments = payments;
        this.clock = clock;
    }

    @ApplicationModuleListener
    void on(PaymentSucceeded event) {
        orders.markPaid(event.orderId()).ifPresent(order -> carts
                .removePurchased(new CartOwner.Customer(order.getUserId()), OrderService.quantities(order)));
    }

    @ApplicationModuleListener
    void on(PaymentExpired event) {
        orders.cancelIfPending(event.orderId(), "payment expired");
    }

    @ApplicationModuleListener
    void on(PaymentCancelled event) {
        orders.cancelIfPending(event.orderId(), "payment cancelled by customer");
    }

    @Scheduled(fixedDelayString = "${shop.orders.expiry-check-interval-ms:60000}", initialDelay = 30_000)
    public void expireOverdueOrders() {
        List<UUID> expired = orders.expireOverdue(clock.instant().minus(GRACE), 100);
        for (UUID orderId : expired) {
            try {
                payments.cancelOpenSessions(orderId);
            }
            catch (RuntimeException e) {
                log.warn("Could not close payment sessions of expired order {}: {}", orderId, e.getMessage());
            }
        }
    }
}
