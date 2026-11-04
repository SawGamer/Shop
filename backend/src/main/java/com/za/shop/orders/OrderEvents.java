package com.za.shop.orders;

import java.util.List;
import java.util.UUID;

/** Facts about orders other modules react to (emails, analytics, fulfilment integrations…). */
public final class OrderEvents {

    private OrderEvents() {
    }

    public record Line(String productName, String details, int quantity, long lineTotalCents) {
    }

    public record OrderPaid(UUID orderId, String orderNumber, UUID userId, String customerEmail, String currency,
            long subtotalCents, long shippingCents, long totalCents, List<Line> lines) {
    }

    public record OrderShipped(UUID orderId, String orderNumber, String customerEmail) {
    }

    public record OrderCancelled(UUID orderId, String orderNumber, String customerEmail, String reason) {
    }
}
