package com.za.shop.shared;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Shop wide settings.
 *
 * @param currency      ISO-4217 code all prices are stored in
 * @param storefrontUrl public URL of the storefront, used in emails and payment redirects
 * @param shipping      shipping fee rules
 */
@ConfigurationProperties("shop")
public record ShopProperties(
        @DefaultValue("EUR") String currency,
        @DefaultValue("http://localhost:3000") String storefrontUrl,
        @DefaultValue Shipping shipping) {

    public record Shipping(
            @DefaultValue("495") long flatRateCents,
            @DefaultValue("5000") long freeThresholdCents) {
    }

    public Money shippingFor(Money subtotal) {
        if (subtotal.cents() == 0 || subtotal.cents() >= shipping.freeThresholdCents()) {
            return Money.zero(currency);
        }
        return Money.of(shipping.flatRateCents(), currency);
    }

    public Money freeShippingThreshold() {
        return Money.of(shipping.freeThresholdCents(), currency);
    }

    public String storefrontUrl() {
        return storefrontUrl.endsWith("/") ? storefrontUrl.substring(0, storefrontUrl.length() - 1) : storefrontUrl;
    }
}
