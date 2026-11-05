package com.za.shop.fulfillment;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.fulfillment.internal.FulfillmentRules;
import com.za.shop.fulfillment.internal.Location;
import com.za.shop.fulfillment.internal.Schedule;
import com.za.shop.fulfillment.internal.SlotCalculator;
import com.za.shop.fulfillment.internal.Zone;
import com.za.shop.settings.ShopSettingsService;
import com.za.shop.shared.ApiException;
import com.za.shop.shared.Money;
import com.za.shop.shared.ShopProperties;

/**
 * Books delivery and pickup slots for orders. A slot has a counter row; booking is one conditional upsert
 * ({@code booked < capacity}), so concurrent checkouts can never overbook a slot.
 */
@Service
public class FulfillmentService {

    private static final Logger log = LoggerFactory.getLogger(FulfillmentService.class);

    public record PickupAddress(String line1, String line2, String postalCode, String city, String country,
            String phone) {
    }

    /**
     * @param subtotalCents goods total, for the minimum order and free-delivery rules
     */
    public record BookRequest(FulfillmentMethod method, String slotId, UUID locationId, String postalCode,
            long subtotalCents) {
    }

    /**
     * @param label         zone name (delivery) or store name (pickup)
     * @param pickupAddress the store's address, for pickups
     */
    public record Booking(String slotKey, Instant startsAt, Instant endsAt, FulfillmentMethod method, String label,
            long feeCents, PickupAddress pickupAddress) {
    }

    private final FulfillmentRules rules;
    private final ShopSettingsService settings;
    private final ShopProperties shop;
    private final JdbcClient jdbc;

    FulfillmentService(FulfillmentRules rules, ShopSettingsService settings, ShopProperties shop, JdbcClient jdbc) {
        this.rules = rules;
        this.settings = settings;
        this.shop = shop;
        this.jdbc = jdbc;
    }

    public boolean isLocalMode() {
        return settings.isLocalFulfillment();
    }

    /**
     * Checks the rules and books the slot inside the caller's transaction (so a failed stock reservation
     * rolls the booking back too).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Booking book(BookRequest request) {
        Schedule schedule = rules.schedule();
        String label;
        long fee = 0;
        PickupAddress pickup = null;
        UUID locationId = null;
        if (request.method() == FulfillmentMethod.DELIVERY) {
            Zone zone = rules.zoneFor(request.postalCode()).orElseThrow(() -> ApiException
                    .badRequest("NOT_DELIVERABLE", "We don't deliver to this postcode")
                    .with("errors", Map.of("postalCode", "We don't deliver here yet")));
            if (request.subtotalCents() < zone.getMinOrderCents()) {
                throw ApiException.badRequest("BELOW_MINIMUM_ORDER", "The minimum order for this area is not reached")
                        .with("minOrder", Money.of(zone.getMinOrderCents(), shop.currency()))
                        .with("subtotal", Money.of(request.subtotalCents(), shop.currency()));
            }
            fee = zone.getFreeFromCents() != null && request.subtotalCents() >= zone.getFreeFromCents() ? 0
                    : zone.getFeeCents();
            label = zone.getName();
        }
        else {
            Location location = request.locationId() == null ? null : rules.location(request.locationId()).orElse(null);
            if (location == null) {
                throw ApiException.badRequest("VALIDATION_FAILED", "Choose a pickup store").with("errors",
                        Map.of("locationId", "Unknown store"));
            }
            locationId = location.getId();
            label = location.getName();
            pickup = new PickupAddress(location.getLine1(), location.getLine2(), location.getPostalCode(),
                    location.getCity(), location.getCountry(), location.getPhone());
        }

        long epoch = parseSlot(request.slotId());
        SlotCalculator.SlotWindow window = rules.slots(schedule, schedule.getHorizonDays()).stream()
                .filter(w -> w.start().getEpochSecond() == epoch).findFirst().orElseThrow(FulfillmentService::slotGone);
        String key = FulfillmentRules.slotKey(request.method(), locationId, epoch);
        if (!tryBook(key, schedule.getCapacityPerSlot())) {
            throw slotGone();
        }
        return new Booking(key, window.start(), window.end(), request.method(), label, fee, pickup);
    }

    /** Frees a booked slot (the order was cancelled or expired). */
    @Transactional
    public void release(String slotKey) {
        jdbc.sql("update slot_counters set booked = greatest(booked - 1, 0) where slot_key = :key")
                .param("key", slotKey).update();
    }

    /** Takes the slot again for an order that was paid after it had expired. False when it filled up meanwhile. */
    @Transactional
    public boolean rebook(String slotKey) {
        boolean booked = tryBook(slotKey, rules.schedule().getCapacityPerSlot());
        if (!booked) {
            log.warn("Slot {} is full although an expired order was paid for it; the shop must reschedule", slotKey);
        }
        return booked;
    }

    private boolean tryBook(String key, int capacity) {
        return jdbc.sql("""
                insert into slot_counters (slot_key, booked) values (:key, 1)
                on conflict (slot_key) do update set booked = slot_counters.booked + 1
                where slot_counters.booked < :capacity""")
                .param("key", key).param("capacity", capacity).update() > 0;
    }

    private static long parseSlot(String slotId) {
        try {
            return Long.parseLong(slotId);
        }
        catch (NumberFormatException e) {
            throw slotGone();
        }
    }

    private static ApiException slotGone() {
        return ApiException.conflict("SLOT_UNAVAILABLE", "That time slot is no longer available, please pick another");
    }
}
