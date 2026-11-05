package com.za.shop.identity;

import java.util.UUID;

/** A customer asked for a password reset link; the notifications module emails it. */
public record PasswordResetRequested(UUID userId, String email, String firstName, String token) {
}
