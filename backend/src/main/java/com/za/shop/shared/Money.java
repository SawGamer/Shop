package com.za.shop.shared;

import java.util.Objects;

/**
 * An amount in minor units (cents) of a currency. Money is never represented as a floating point number.
 */
public record Money(long cents, String currency) {

    public Money {
        Objects.requireNonNull(currency, "currency");
    }

    public static Money of(long cents, String currency) {
        return new Money(cents, currency);
    }

    public static Money zero(String currency) {
        return new Money(0, currency);
    }

    public Money plus(Money other) {
        requireSameCurrency(other);
        return new Money(Math.addExact(cents, other.cents), currency);
    }

    public Money times(int quantity) {
        return new Money(Math.multiplyExact(cents, quantity), currency);
    }

    private void requireSameCurrency(Money other) {
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException("Currency mismatch: " + currency + " vs " + other.currency);
        }
    }
}
