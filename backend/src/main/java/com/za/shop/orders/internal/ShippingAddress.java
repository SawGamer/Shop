package com.za.shop.orders.internal;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public record ShippingAddress(
        @Column(name = "ship_full_name") String fullName,
        @Column(name = "ship_line1") String line1,
        @Column(name = "ship_line2") String line2,
        @Column(name = "ship_postal_code") String postalCode,
        @Column(name = "ship_city") String city,
        @Column(name = "ship_country") String country,
        @Column(name = "ship_phone") String phone) {
}
