package com.za.shop.payments.internal;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param provider {@code fake} (development: a test payment page, no keys needed) or {@code stripe}
 */
@ConfigurationProperties("shop.payments")
public record PaymentProperties(@DefaultValue("fake") String provider, @DefaultValue Stripe stripe) {

    /**
     * @param secretKey     Stripe secret API key ({@code sk_test_…} / {@code sk_live_…})
     * @param webhookSecret signing secret of the webhook endpoint ({@code whsec_…})
     * @param sessionTtl    how long the hosted checkout page stays valid (Stripe minimum is 30 minutes)
     */
    public record Stripe(String secretKey, String webhookSecret, @DefaultValue("31m") Duration sessionTtl) {
    }
}
