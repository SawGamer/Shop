package com.za.shop.payments.internal;

import java.util.UUID;

import com.za.shop.payments.PaymentRequest;
import com.za.shop.shared.ShopProperties;

/** Sends the customer to the storefront's built-in test payment page. Development and tests only. */
class FakePaymentGateway implements PaymentGateway {

    private final ShopProperties shop;

    FakePaymentGateway(ShopProperties shop) {
        this.shop = shop;
    }

    @Override
    public String provider() {
        return "fake";
    }

    @Override
    public ProviderSession create(UUID paymentSessionId, PaymentRequest request) {
        return new ProviderSession("fake_" + paymentSessionId,
                shop.storefrontUrl() + "/checkout/pay/" + paymentSessionId + "?order=" + request.orderId());
    }

    @Override
    public void expire(PaymentSession session) {
        // nothing to do at a fake provider
    }
}
