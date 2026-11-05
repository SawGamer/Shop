package com.za.shop.payments.internal;

import java.time.Clock;
import java.util.Locale;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;

import com.stripe.exception.StripeException;
import com.stripe.param.checkout.SessionCreateParams;
import com.za.shop.payments.PaymentRequest;
import com.za.shop.shared.ApiException;
import com.za.shop.shared.ShopProperties;

/** Stripe Checkout: Stripe hosts the payment page and reports the result through a signed webhook. */
class StripePaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentGateway.class);

    private final StripeCheckoutApi stripe;
    private final ShopProperties shop;
    private final PaymentProperties properties;
    private final Clock clock;

    StripePaymentGateway(StripeCheckoutApi stripe, ShopProperties shop, PaymentProperties properties, Clock clock) {
        this.stripe = stripe;
        this.shop = shop;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    public String provider() {
        return "stripe";
    }

    @Override
    public ProviderSession create(UUID paymentSessionId, PaymentRequest request) {
        String currency = request.currency().toLowerCase(Locale.ROOT);
        SessionCreateParams.Builder params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setClientReferenceId(request.orderId().toString())
                .setCustomerEmail(request.customerEmail())
                .setSuccessUrl(shop.storefrontUrl() + "/checkout/success?order=" + request.orderId())
                .setCancelUrl(shop.storefrontUrl() + "/checkout/cancelled?order=" + request.orderId())
                .setExpiresAt(clock.instant().plus(properties.stripe().sessionTtl()).getEpochSecond())
                .putMetadata("orderId", request.orderId().toString())
                .putMetadata("orderNumber", request.orderNumber())
                .putMetadata("paymentSessionId", paymentSessionId.toString());
        for (PaymentRequest.Line line : request.lines()) {
            SessionCreateParams.LineItem.PriceData.ProductData.Builder product =
                    SessionCreateParams.LineItem.PriceData.ProductData.builder().setName(line.name());
            if (line.details() != null && !line.details().isBlank()) {
                product.setDescription(line.details());
            }
            if (line.imageUrl() != null && line.imageUrl().startsWith("https://")) {
                product.addImage(line.imageUrl());
            }
            params.addLineItem(SessionCreateParams.LineItem.builder()
                    .setQuantity((long) line.quantity())
                    .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency(currency)
                            .setUnitAmount(line.unitPriceCents())
                            .setProductData(product.build())
                            .build())
                    .build());
        }
        if (request.shippingCents() > 0) {
            params.addLineItem(SessionCreateParams.LineItem.builder().setQuantity(1L)
                    .setPriceData(SessionCreateParams.LineItem.PriceData.builder().setCurrency(currency)
                            .setUnitAmount(request.shippingCents())
                            .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                    .setName("Shipping").build())
                            .build())
                    .build());
        }
        try {
            // The idempotency key makes a retried request return the same session instead of a second one.
            StripeCheckoutApi.CreatedSession session = stripe.create(params.build(), "checkout-" + paymentSessionId);
            return new ProviderSession(session.id(), session.url());
        }
        catch (StripeException e) {
            log.error("Stripe checkout session creation failed for order {}: {}", request.orderNumber(),
                    e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PAYMENT_PROVIDER_ERROR",
                    "The payment provider is not reachable, please try again");
        }
    }

    @Override
    public void expire(PaymentSession session) {
        if (session.getProviderSessionId() == null) {
            return;
        }
        try {
            stripe.expire(session.getProviderSessionId());
        }
        catch (StripeException e) {
            log.warn("Could not expire Stripe session {}: {}", session.getProviderSessionId(), e.getMessage());
        }
    }
}
