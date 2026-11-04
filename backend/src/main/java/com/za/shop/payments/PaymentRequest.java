package com.za.shop.payments;

import java.util.List;
import java.util.UUID;

/** Everything a payment provider needs to show the customer what they are paying for. */
public record PaymentRequest(UUID orderId, UUID userId, String orderNumber, String customerEmail, String currency,
        List<Line> lines, long shippingCents, long totalCents) {

    public record Line(String name, String details, long unitPriceCents, int quantity, String imageUrl) {
    }
}
