package com.za.shop.payments.internal;

import java.time.Clock;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.stripe.StripeClient;
import com.za.shop.shared.ShopProperties;

@Configuration(proxyBeanMethods = false)
class PaymentConfig {

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnProperty(name = "shop.payments.provider", havingValue = "stripe")
    static class Stripe {

        @Bean
        StripeCheckoutApi stripeCheckoutApi(PaymentProperties properties) {
            String key = properties.stripe().secretKey();
            if (key == null || key.isBlank()) {
                throw new IllegalStateException("shop.payments.stripe.secret-key must be set when provider=stripe");
            }
            return StripeCheckoutApi.using(new StripeClient(key));
        }

        @Bean
        PaymentGateway stripePaymentGateway(StripeCheckoutApi api, ShopProperties shop, PaymentProperties properties,
                Clock clock) {
            return new StripePaymentGateway(api, shop, properties, clock);
        }
    }

    @Bean
    @ConditionalOnProperty(name = "shop.payments.provider", havingValue = "fake", matchIfMissing = true)
    PaymentGateway fakePaymentGateway(ShopProperties shop) {
        return new FakePaymentGateway(shop);
    }
}
