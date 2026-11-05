package com.za.shop.identity.internal;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    private String tokenHash;

    private UUID userId;

    private Instant createdAt;

    private Instant expiresAt;

    private Instant usedAt;

    protected PasswordResetToken() {
    }

    public PasswordResetToken(String tokenHash, UUID userId, Instant createdAt, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.userId = userId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public boolean isUsable(Instant now) {
        return usedAt == null && expiresAt.isAfter(now);
    }

    public UUID getUserId() {
        return userId;
    }
}
