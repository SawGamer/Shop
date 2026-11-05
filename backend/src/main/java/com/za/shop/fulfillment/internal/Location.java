package com.za.shop.fulfillment.internal;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A store where customers can collect their orders. */
@Entity
@Table(name = "fulfillment_locations")
public class Location {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    private String name;

    private String line1;

    private String line2;

    private String postalCode;

    private String city;

    private String country;

    private String phone;

    private String openingHours;

    private Instant createdAt;

    protected Location() {
    }

    public Location(String name, String line1, String line2, String postalCode, String city, String country,
            String phone, String openingHours, Instant now) {
        this.createdAt = now;
        update(name, line1, line2, postalCode, city, country, phone, openingHours);
    }

    public void update(String name, String line1, String line2, String postalCode, String city, String country,
            String phone, String openingHours) {
        this.name = name;
        this.line1 = line1;
        this.line2 = line2;
        this.postalCode = postalCode;
        this.city = city;
        this.country = country;
        this.phone = phone;
        this.openingHours = openingHours == null ? "" : openingHours;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getLine1() {
        return line1;
    }

    public String getLine2() {
        return line2;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public String getCity() {
        return city;
    }

    public String getCountry() {
        return country;
    }

    public String getPhone() {
        return phone;
    }

    public String getOpeningHours() {
        return openingHours;
    }
}
