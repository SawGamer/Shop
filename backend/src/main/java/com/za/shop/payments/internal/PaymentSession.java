package com.za.shop.payments.internal;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "payment_sessions")
public class PaymentSession {

    public enum Status {
        OPEN, SUCCEEDED, EXPIRED, CANCELLED
    }

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    private UUID orderId;

    private UUID userId;

    private String provider;

    private String providerSessionId;

    @Enumerated(EnumType.STRING)
    private Status status;

    private long amountCents;

    private String currency;

    private String paymentUrl;

    private Instant createdAt;

    private Instant updatedAt;

    @Version
    private Long version;

    protected PaymentSession() {
    }

    public PaymentSession(UUID orderId, UUID userId, String provider, long amountCents, String currency, Instant now) {
        this.orderId = orderId;
        this.userId = userId;
        this.provider = provider;
        this.amountCents = amountCents;
        this.currency = currency;
        this.status = Status.OPEN;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** Closed because the order was cancelled on our side: no event, the order already knows. */
    public void closeSilently(Instant now) {
        close(Status.EXPIRED, now);
    }

    public void attach(String providerSessionId, String paymentUrl, Instant now) {
        this.providerSessionId = providerSessionId;
        this.paymentUrl = paymentUrl;
        this.updatedAt = now;
    }

    /** Money arrived. Accepted from any state: a late payment for an expired session must still be recorded. */
    boolean markSucceeded(Instant now) {
        if (status == Status.SUCCEEDED) {
            return false;
        }
        status = Status.SUCCEEDED;
        updatedAt = now;
        return true;
    }

    boolean close(Status target, Instant now) {
        if (status != Status.OPEN) {
            return false;
        }
        status = target;
        updatedAt = now;
        return true;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getProviderSessionId() {
        return providerSessionId;
    }

    public Status getStatus() {
        return status;
    }

    public long getAmountCents() {
        return amountCents;
    }

    public String getCurrency() {
        return currency;
    }
}
