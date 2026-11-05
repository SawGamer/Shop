package com.za.shop.identity.internal;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.core.io.Resource;

/**
 * @param issuer              {@code iss} claim of access tokens
 * @param accessTokenTtl      lifetime of access tokens (short; they cannot be revoked)
 * @param refreshTokenTtl     lifetime of refresh tokens
 * @param refreshReuseGrace   a rotated refresh token may be replayed within this window (parallel requests
 *                            from the storefront) without being treated as stolen
 * @param verificationTtl     lifetime of email verification links
 * @param jwtPrivateKey       PKCS#8 PEM of the RSA signing key. All instances must share it. When absent a
 *                            temporary key is generated (fine for a single dev instance only)
 * @param jwtPublicKey        X.509 PEM of the matching public key
 * @param corsAllowedOrigins  browser origins allowed to call the API directly
 * @param bootstrapUsers      accounts created at startup if missing (e.g. the first admin)
 */
@ConfigurationProperties("shop.identity")
public record IdentityProperties(
        @DefaultValue("za-shop") String issuer,
        @DefaultValue("15m") Duration accessTokenTtl,
        @DefaultValue("30d") Duration refreshTokenTtl,
        @DefaultValue("30s") Duration refreshReuseGrace,
        @DefaultValue("48h") Duration verificationTtl,
        Resource jwtPrivateKey,
        Resource jwtPublicKey,
        @DefaultValue("http://localhost:3000") List<String> corsAllowedOrigins,
        @DefaultValue List<BootstrapUser> bootstrapUsers) {

    public record BootstrapUser(String email, String password, String firstName, String lastName, boolean admin) {
    }
}
