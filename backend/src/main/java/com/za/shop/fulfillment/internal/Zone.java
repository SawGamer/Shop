package com.za.shop.fulfillment.internal;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

/** A delivery area: every postcode starting with one of the prefixes, with its fee and minimum order. */
@Entity
@Table(name = "fulfillment_zones")
public class Zone {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    private String name;

    private long feeCents;

    private Long freeFromCents;

    private long minOrderCents;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "fulfillment_zone_prefixes", joinColumns = @JoinColumn(name = "zone_id"))
    @Column(name = "prefix")
    private Set<String> postcodePrefixes = new HashSet<>();

    private Instant createdAt;

    protected Zone() {
    }

    public Zone(String name, Set<String> postcodePrefixes, long feeCents, Long freeFromCents, long minOrderCents,
            Instant now) {
        this.createdAt = now;
        update(name, postcodePrefixes, feeCents, freeFromCents, minOrderCents);
    }

    public void update(String name, Set<String> postcodePrefixes, long feeCents, Long freeFromCents,
            long minOrderCents) {
        this.name = name;
        this.postcodePrefixes.clear();
        this.postcodePrefixes.addAll(postcodePrefixes);
        this.feeCents = feeCents;
        this.freeFromCents = freeFromCents;
        this.minOrderCents = minOrderCents;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public long getFeeCents() {
        return feeCents;
    }

    public Long getFreeFromCents() {
        return freeFromCents;
    }

    public long getMinOrderCents() {
        return minOrderCents;
    }

    public Set<String> getPostcodePrefixes() {
        return postcodePrefixes;
    }
}
