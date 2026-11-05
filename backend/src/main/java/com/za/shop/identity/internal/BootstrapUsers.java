package com.za.shop.identity.internal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Creates the accounts listed in {@code shop.identity.bootstrap-users} (for example the first admin).
 * Replaces the old approach of hard-coding an admin email address in the registration code.
 */
@Component
@Order(0)
class BootstrapUsers implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapUsers.class);

    private final AuthService authService;
    private final IdentityProperties properties;

    BootstrapUsers(AuthService authService, IdentityProperties properties) {
        this.authService = authService;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        for (IdentityProperties.BootstrapUser user : properties.bootstrapUsers()) {
            if (user.email() == null || user.email().isBlank() || user.password() == null || user.password().isBlank()) {
                continue;
            }
            authService.ensureUser(user);
            log.info("Ensured bootstrap account {} (admin={})", user.email(), user.admin());
        }
    }
}
