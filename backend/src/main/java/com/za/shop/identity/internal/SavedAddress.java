package com.za.shop.identity.internal;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "customer_addresses")
public class SavedAddress {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    private UUID userId;

    private String label;

    private String fullName;

    private String line1;

    private String line2;

    private String postalCode;

    private String city;

    private String country;

    private String phone;

    private boolean isDefault;

    private Instant createdAt;

    protected SavedAddress() {
    }

    SavedAddress(UUID userId, Instant createdAt) {
        this.userId = userId;
        this.createdAt = createdAt;
    }

    void fill(String label, String fullName, String line1, String line2, String postalCode, String city,
            String country, String phone) {
        this.label = label;
        this.fullName = fullName;
        this.line1 = line1;
        this.line2 = line2;
        this.postalCode = postalCode;
        this.city = city;
        this.country = country;
        this.phone = phone;
    }

    void setDefault(boolean value) {
        this.isDefault = value;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getLabel() {
        return label;
    }

    public String getFullName() {
        return fullName;
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

    public boolean isDefault() {
        return isDefault;
    }
}
