package com.za.shop.identity.internal;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.identity.Role;
import com.za.shop.shared.ApiException;

/**
 * Issues short-lived JWT access tokens and long-lived, rotating, opaque refresh tokens.
 * Re-using a refresh token after it was rotated (outside a short grace window) means it was
 * probably stolen, so the whole login session ("family") is revoked.
 */
@Service
class TokenService {

    private static final Logger log = LoggerFactory.getLogger(TokenService.class);

    record IssuedTokens(String accessToken, Instant accessTokenExpiresAt, String refreshToken,
            Instant refreshTokenExpiresAt, User user) {
    }

    private final JwtEncoder jwtEncoder;
    private final RefreshTokenRepository refreshTokens;
    private final UserRepository users;
    private final IdentityProperties properties;
    private final Clock clock;

    TokenService(JwtEncoder jwtEncoder, RefreshTokenRepository refreshTokens, UserRepository users,
            IdentityProperties properties, Clock clock) {
        this.jwtEncoder = jwtEncoder;
        this.refreshTokens = refreshTokens;
        this.users = users;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional
    IssuedTokens issueFor(User user) {
        return issue(user, UUID.randomUUID());
    }

    /** Runs in its own transaction so that a family revocation is committed even though we then fail. */
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = ApiException.class)
    IssuedTokens rotate(String rawRefreshToken) {
        Instant now = clock.instant();
        RefreshToken token = refreshTokens.findForUpdate(SecureTokens.sha256(rawRefreshToken))
                .orElseThrow(TokenService::invalidToken);
        if (token.getExpiresAt().isBefore(now)) {
            throw invalidToken();
        }
        if (token.getRevokedAt() != null) {
            boolean withinGrace = token.getRevokedAt().plus(properties.refreshReuseGrace()).isAfter(now);
            if (!withinGrace) {
                int revoked = refreshTokens.revokeFamily(token.getFamilyId(), now);
                log.warn("Refresh token reuse detected for user {}; revoked {} tokens of the session", token.getUserId(),
                        revoked);
                throw invalidToken();
            }
        }
        token.revoke(now);
        User user = users.findById(token.getUserId()).orElseThrow(TokenService::invalidToken);
        return issue(user, token.getFamilyId());
    }

    @Transactional
    void revokeSession(String rawRefreshToken) {
        refreshTokens.findByTokenHash(SecureTokens.sha256(rawRefreshToken))
                .ifPresent(token -> refreshTokens.revokeFamily(token.getFamilyId(), clock.instant()));
    }

    @Scheduled(cron = "${shop.identity.cleanup-cron:0 17 3 * * *}")
    @Transactional
    public void deleteExpiredTokens() {
        int deleted = refreshTokens.deleteExpiredBefore(clock.instant());
        if (deleted > 0) {
            log.info("Deleted {} expired refresh tokens", deleted);
        }
    }

    private IssuedTokens issue(User user, UUID familyId) {
        Instant now = clock.instant();
        Instant accessExpiresAt = now.plus(properties.accessTokenTtl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(accessExpiresAt)
                .id(UUID.randomUUID().toString())
                .claim("email", user.getEmail())
                .claim("name", user.getFirstName())
                .claim("roles", user.getRoles().stream().sorted(Comparator.comparing(Role::ordinal))
                        .map(Role::name).toList())
                .build();
        String accessToken = jwtEncoder
                .encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), claims))
                .getTokenValue();

        String rawRefresh = SecureTokens.newToken();
        Instant refreshExpiresAt = now.plus(properties.refreshTokenTtl());
        refreshTokens.save(new RefreshToken(user.getId(), SecureTokens.sha256(rawRefresh), familyId, now,
                refreshExpiresAt));
        return new IssuedTokens(accessToken, accessExpiresAt, rawRefresh, refreshExpiresAt, user);
    }

    private static ApiException invalidToken() {
        return ApiException.unauthorized("INVALID_TOKEN", "Refresh token is invalid or expired");
    }
}
