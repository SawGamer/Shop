package com.za.shop.fulfillment.internal;

import java.time.Clock;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.settings.FulfillmentMode;
import com.za.shop.settings.ShopSettingsService;

/** The grocery demo delivers in slots: two Berlin zones, two stores, Mon–Sat 08:00–20:00. */
@Component
@Order(11)
@ConditionalOnProperty(name = "shop.seed.enabled", havingValue = "true")
class DemoFulfillmentSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoFulfillmentSeeder.class);

    private final ZoneRepository zones;
    private final LocationRepository locations;
    private final FulfillmentRules rules;
    private final ShopSettingsService settings;
    private final Clock clock;
    private final String catalog;

    DemoFulfillmentSeeder(ZoneRepository zones, LocationRepository locations, FulfillmentRules rules,
            ShopSettingsService settings, Clock clock, @Value("${shop.seed.catalog:footwear}") String catalog) {
        this.zones = zones;
        this.locations = locations;
        this.rules = rules;
        this.settings = settings;
        this.clock = clock;
        this.catalog = catalog;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!"grocery".equalsIgnoreCase(catalog.trim()) || zones.count() > 0 || locations.count() > 0) {
            return;
        }
        rules.schedule();
        zones.save(new Zone("Berlin Mitte", Set.of("101", "102", "103"), 490, 6000L, 2000, clock.instant()));
        zones.save(new Zone("Greater Berlin", Set.of("12", "13", "14"), 690, 8000L, 3000, clock.instant()));
        locations.save(new Location("Green Basket Mitte", "Friedrichstraße 112", null, "10117", "Berlin", "DE", null,
                "Mon–Sat 08:00–20:00", clock.instant()));
        locations.save(new Location("Green Basket Charlottenburg", "Kantstraße 40", null, "10625", "Berlin", "DE",
                null, "Mon–Sat 08:00–20:00", clock.instant()));
        settings.setFulfillmentMode(FulfillmentMode.LOCAL);
        log.info("Seeded demo delivery zones and pickup stores (fulfillment mode LOCAL)");
    }
}
