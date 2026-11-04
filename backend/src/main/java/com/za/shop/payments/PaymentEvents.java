package com.za.shop.payments;

import java.util.UUID;

/** Outcomes of a payment session, published by the payments module. */
public final class PaymentEvents {

    private PaymentEvents() {
    }

    /** The provider confirmed the money was captured. */
    public record PaymentSucceeded(UUID orderId, UUID paymentSessionId) {
    }

    /** The payment window closed without a payment. */
    public record PaymentExpired(UUID orderId, UUID paymentSessionId) {
    }

    /** The customer abandoned the payment. */
    public record PaymentCancelled(UUID orderId, UUID paymentSessionId) {
    }
}
