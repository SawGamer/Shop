package com.za.shop.identity.internal;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.identity.AccountDeleted;
import com.za.shop.identity.PasswordResetRequested;
import com.za.shop.identity.Role;
import com.za.shop.identity.VerificationEmailRequested;
import com.za.shop.shared.ApiException;

@Service
class AuthService {

    private final UserRepository users;
    private final EmailVerificationTokenRepository verificationTokens;
    private final PasswordResetTokenRepository resetTokens;
    private final RefreshTokenRepository refreshTokens;
    private final SavedAddressRepository addresses;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final ApplicationEventPublisher events;
    private final IdentityProperties properties;
    private final Clock clock;
    /** Compared against when the email is unknown, so response times don't reveal which emails exist. */
    private final String dummyHash;

    AuthService(UserRepository users, EmailVerificationTokenRepository verificationTokens,
            PasswordResetTokenRepository resetTokens, RefreshTokenRepository refreshTokens,
            SavedAddressRepository addresses, PasswordEncoder passwordEncoder, TokenService tokenService,
            ApplicationEventPublisher events, IdentityProperties properties, Clock clock) {
        this.users = users;
        this.resetTokens = resetTokens;
        this.refreshTokens = refreshTokens;
        this.addresses = addresses;
        this.verificationTokens = verificationTokens;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.events = events;
        this.properties = properties;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    TokenService.IssuedTokens register(String email, String password, String firstName, String lastName) {
        String normalized = normalizeEmail(email);
        if (users.existsByEmail(normalized)) {
            throw ApiException.conflict("EMAIL_TAKEN", "An account with this email already exists");
        }
        User user = users.save(new User(normalized, passwordEncoder.encode(password), firstName.trim(),
                lastName.trim(), clock.instant()));
        requestVerification(user);
        return tokenService.issueFor(user);
    }

    @Transactional
    TokenService.IssuedTokens login(String email, String password) {
        User user = users.findByEmail(normalizeEmail(email)).orElse(null);
        if (user == null) {
            passwordEncoder.matches(password, dummyHash);
            throw invalidCredentials();
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return tokenService.issueFor(user);
    }

    @Transactional
    void verifyEmail(String rawToken) {
        Instant now = clock.instant();
        EmailVerificationToken token = verificationTokens.findById(SecureTokens.sha256(rawToken))
                .filter(t -> t.isUsable(now))
                .orElseThrow(() -> ApiException.unauthorized("INVALID_TOKEN", "Verification link is invalid or expired"));
        token.markUsed(now);
        users.findById(token.getUserId()).ifPresent(user -> user.markEmailVerified(now));
    }

    @Transactional
    void resendVerification(UUID userId) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (!user.isEmailVerified()) {
            requestVerification(user);
        }
    }

    @Transactional(readOnly = true)
    User get(UUID userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
    }

    /** Creates or promotes configured accounts (first admin, demo customer). Idempotent. */
    @Transactional
    void ensureUser(IdentityProperties.BootstrapUser spec) {
        Instant now = clock.instant();
        String email = normalizeEmail(spec.email());
        User user = users.findByEmail(email).orElseGet(() -> {
            User created = new User(email, passwordEncoder.encode(spec.password()),
                    spec.firstName() == null ? "Shop" : spec.firstName(),
                    spec.lastName() == null ? "Owner" : spec.lastName(), now);
            created.markEmailVerified(now);
            return users.save(created);
        });
        if (spec.admin()) {
            user.grant(Role.ADMIN, now);
        }
    }

    /** Always silent: the response must not reveal whether the email has an account. */
    @Transactional
    void forgotPassword(String email) {
        Instant now = clock.instant();
        users.findByEmail(normalizeEmail(email)).ifPresent(user -> {
            if (resetTokens.existsByUserIdAndCreatedAtAfter(user.getId(), now.minus(RESET_COOLDOWN))) {
                return; // at most one email per minute per account
            }
            String raw = SecureTokens.newToken();
            resetTokens.save(new PasswordResetToken(SecureTokens.sha256(raw), user.getId(), now,
                    now.plus(RESET_VALIDITY)));
            events.publishEvent(new PasswordResetRequested(user.getId(), user.getEmail(), user.getFirstName(), raw));
        });
    }

    @Transactional
    void resetPassword(String rawToken, String newPassword) {
        Instant now = clock.instant();
        PasswordResetToken token = resetTokens.findById(SecureTokens.sha256(rawToken)).filter(t -> t.isUsable(now))
                .orElseThrow(() -> ApiException.unauthorized("INVALID_TOKEN", "This link is invalid or has expired"));
        User user = users.findById(token.getUserId())
                .orElseThrow(() -> ApiException.unauthorized("INVALID_TOKEN", "This link is invalid or has expired"));
        user.changePassword(passwordEncoder.encode(newPassword), now);
        user.markEmailVerified(now); // the link was delivered to the address, which proves it
        resetTokens.deleteByUserId(user.getId()); // this and every other open link stop working
        tokenService.revokeAllSessions(user.getId());
    }

    @Transactional
    void deleteAccount(UUID userId, String password) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw invalidCredentials();
        }
        if (user.getRoles().contains(Role.ADMIN)) {
            throw ApiException.forbidden("Admin accounts cannot be deleted here");
        }
        refreshTokens.deleteByUserId(userId);
        verificationTokens.deleteByUserId(userId);
        resetTokens.deleteByUserId(userId);
        addresses.deleteByUserId(userId);
        // The row stays (orders point at it) but holds no personal data and cannot be logged into.
        user.anonymize("deleted-" + userId + "@deleted.invalid", passwordEncoder.encode(UUID.randomUUID().toString()),
                clock.instant());
        events.publishEvent(new AccountDeleted(userId));
    }

    private void requestVerification(User user) {
        String raw = SecureTokens.newToken();
        verificationTokens.save(new EmailVerificationToken(SecureTokens.sha256(raw), user.getId(),
                clock.instant().plus(properties.verificationTtl())));
        events.publishEvent(new VerificationEmailRequested(user.getId(), user.getEmail(), user.getFirstName(), raw));
    }

    private static final java.time.Duration RESET_VALIDITY = java.time.Duration.ofHours(1);
    private static final java.time.Duration RESET_COOLDOWN = java.time.Duration.ofMinutes(1);

    private static ApiException invalidCredentials() {
        return ApiException.unauthorized("INVALID_CREDENTIALS", "Email or password is incorrect");
    }
}
