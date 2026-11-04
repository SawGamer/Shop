package com.za.shop.payments.internal;

import com.stripe.StripeClient;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.param.checkout.SessionCreateParams;

/** The two Stripe calls the shop makes, behind an interface so tests can replace them. */
public interface StripeCheckoutApi {

    record CreatedSession(String id, String url) {
    }

    CreatedSession create(SessionCreateParams params, String idempotencyKey) throws StripeException;

    void expire(String sessionId) throws StripeException;

    static StripeCheckoutApi using(StripeClient client) {
        return new StripeCheckoutApi() {
            @Override
            public CreatedSession create(SessionCreateParams params, String idempotencyKey) throws StripeException {
                Session session = client.v1().checkout().sessions().create(params,
                        RequestOptions.builder().setIdempotencyKey(idempotencyKey).build());
                return new CreatedSession(session.getId(), session.getUrl());
            }

            @Override
            public void expire(String sessionId) throws StripeException {
                client.v1().checkout().sessions().expire(sessionId);
            }
        };
    }
}
