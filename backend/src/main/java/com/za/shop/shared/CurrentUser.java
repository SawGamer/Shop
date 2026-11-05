package com.za.shop.shared;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** Reads the authenticated customer from the validated access token of the current request. */
public final class CurrentUser {

    private CurrentUser() {
    }

    public record AuthenticatedUser(UUID id, String email, List<String> roles) {
        public boolean isAdmin() {
            return roles.contains("ADMIN");
        }
    }

    public static Optional<AuthenticatedUser> find() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken token && token.isAuthenticated()) {
            List<String> roles = token.getToken().getClaimAsStringList("roles");
            return Optional.of(new AuthenticatedUser(UUID.fromString(token.getName()),
                    token.getToken().getClaimAsString("email"), roles == null ? List.of() : roles));
        }
        return Optional.empty();
    }

    public static AuthenticatedUser require() {
        return find().orElseThrow(() -> ApiException.unauthorized("UNAUTHORIZED", "Please log in"));
    }
}
