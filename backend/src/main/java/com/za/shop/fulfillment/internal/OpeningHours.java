package com.za.shop.fulfillment.internal;

import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** Opening window on one ISO weekday (1 = Monday … 7 = Sunday), in the shop's time zone. */
@Embeddable
public record OpeningHours(
        @Column(name = "day_of_week") int dayOfWeek,
        @Column(name = "from_time") LocalTime fromTime,
        @Column(name = "to_time") LocalTime toTime) {
}
