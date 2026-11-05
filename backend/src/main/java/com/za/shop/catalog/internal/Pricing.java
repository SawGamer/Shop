package com.za.shop.catalog.internal;

import java.util.Optional;

/**
 * What a variant actually costs right now. While a deal runs, the price is discounted and the regular
 * price becomes the "was" price; the same rule applies in product pages, search, carts and orders.
 */
public final class Pricing {

    public record Effective(long priceCents, Long compareAtCents) {
    }

    private Pricing() {
    }

    public static Effective of(ProductVariant variant, Optional<Deal> runningDeal) {
        if (runningDeal.isPresent()) {
            return new Effective(runningDeal.get().apply(variant.getPriceCents()), variant.getPriceCents());
        }
        return new Effective(variant.getPriceCents(), variant.effectiveCompareAtCents());
    }
}
