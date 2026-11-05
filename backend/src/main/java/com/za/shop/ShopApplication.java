package com.za.shop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Z&A Shop — a modular monolith. Each direct sub-package is an application module
 * (identity, catalog, media, inventory, search, cart, orders, payments, notifications, backoffice)
 * whose boundaries are verified by {@code ModularityTests}. Modules talk to each other through
 * their public API types and through persisted domain events, so any module can later be
 * extracted into its own service without rewriting its callers.
 */
@SpringBootApplication
@EnableScheduling
@ConfigurationPropertiesScan
public class ShopApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShopApplication.class, args);
    }
}
