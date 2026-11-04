package com.za.shop.identity.internal;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.identity.Role;
import com.za.shop.identity.VerificationEmailRequested;
import com.za.shop.shared.ApiException;

@Service
class AuthService {

    private final UserRepository users;
    private final EmailVerificationTokenRepository verificationTokens;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final ApplicationEventPublisher events;
    private final IdentityProperties properties;
    private final Clock clock;
    /** Compared against when the email is unknown, so response times don't reveal which emails exist. */
    private final String dummyHash;

    AuthService(UserRepository users, EmailVerificationTokenRepository verificationTokens,
            PasswordEncoder passwordEncoder, TokenService tokenService, ApplicationEventPublisher events,
            IdentityProperties properties, Clock clock) {
        this.users = users;
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

    private void requestVerification(User user) {
        String raw = SecureTokens.newToken();
        verificationTokens.save(new EmailVerificationToken(SecureTokens.sha256(raw), user.getId(),
                clock.instant().plus(properties.verificationTtl())));
        events.publishEvent(new VerificationEmailRequested(user.getId(), user.getEmail(), user.getFirstName(), raw));
    }

    private static ApiException invalidCredentials() {
        return ApiException.unauthorized("INVALID_CREDENTIALS", "Email or password is incorrect");
    }
}
