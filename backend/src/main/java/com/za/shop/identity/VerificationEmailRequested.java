package com.za.shop.identity;

import java.util.UUID;

/**
 * Published when a customer registers or asks for a new verification link.
 * The notifications module turns it into an email.
 */
public record VerificationEmailRequested(UUID userId, String email, String firstName, String token) {
}
