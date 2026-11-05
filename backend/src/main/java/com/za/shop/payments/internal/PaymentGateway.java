package com.za.shop.payments.internal;

import java.util.UUID;

import com.za.shop.payments.PaymentRequest;

/** A hosted payment page provider. The shop never sees card data (keeps PCI scope minimal). */
public interface PaymentGateway {

    record ProviderSession(String providerSessionId, String url) {
    }

    String provider();

    ProviderSession create(UUID paymentSessionId, PaymentRequest request);

    /** Best effort: stop the customer from paying an order that was cancelled. */
    void expire(PaymentSession session);
}
