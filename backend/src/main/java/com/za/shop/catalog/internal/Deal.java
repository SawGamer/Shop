package com.za.shop.catalog.internal;

import java.time.Instant;

/** A percentage off every variant of a product between two instants. */
public record Deal(int percentOff, Instant startsAt, Instant endsAt) {

    public boolean isRunning(Instant now) {
        return !now.isBefore(startsAt) && now.isBefore(endsAt);
    }

    /** Discounted price in cents, rounded half up to the cent. */
    public long apply(long cents) {
        return (cents * (100 - percentOff) + 50) / 100;
    }
}
