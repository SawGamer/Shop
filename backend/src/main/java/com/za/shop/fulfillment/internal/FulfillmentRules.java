package com.za.shop.fulfillment.internal;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.IntStream;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.fulfillment.FulfillmentMethod;
import com.za.shop.shared.ShopProperties;

/** Reads zones, stores and the schedule, and turns them into bookable slots. */
@Service
public class FulfillmentRules {

    private final ScheduleRepository schedules;
    private final ZoneRepository zones;
    private final LocationRepository locations;
    private final ShopProperties shop;
    private final Clock clock;
    private final JdbcClient jdbc;

    FulfillmentRules(ScheduleRepository schedules, ZoneRepository zones, LocationRepository locations,
            ShopProperties shop, Clock clock, JdbcClient jdbc) {
        this.schedules = schedules;
        this.zones = zones;
        this.locations = locations;
        this.shop = shop;
        this.clock = clock;
        this.jdbc = jdbc;
    }

    public ZoneId zoneId() {
        return ZoneId.of(shop.timeZone());
    }

    /** The schedule; created with sensible defaults (Mon–Sat 08:00–20:00, 1 hour slots) on first use. */
    @Transactional
    public Schedule schedule() {
        return schedules.findById(Schedule.SINGLETON_ID).orElseGet(() -> schedules.save(new Schedule(60, 20, 120, 7,
                IntStream.rangeClosed(DayOfWeek.MONDAY.getValue(), DayOfWeek.SATURDAY.getValue())
                        .mapToObj(day -> new OpeningHours(day, LocalTime.of(8, 0), LocalTime.of(20, 0))).toList())));
    }

    @Transactional(readOnly = true)
    public List<Zone> zones() {
        return zones.findAll();
    }

    /** The zone serving the postcode: the one with the longest matching prefix. */
    @Transactional(readOnly = true)
    public Optional<Zone> zoneFor(String postcode) {
        String normalized = normalizePostcode(postcode);
        Zone best = null;
        int bestLength = 0;
        for (Zone zone : zones.findAll()) {
            for (String prefix : zone.getPostcodePrefixes()) {
                if (normalized.startsWith(prefix.toUpperCase(Locale.ROOT)) && prefix.length() > bestLength) {
                    best = zone;
                    bestLength = prefix.length();
                }
            }
        }
        return Optional.ofNullable(best);
    }

    @Transactional(readOnly = true)
    public List<Location> locations() {
        return locations.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Location> location(UUID id) {
        return locations.findById(id);
    }

    /** All slots of the next {@code days} days (at most the schedule's horizon), earliest first. */
    public List<SlotCalculator.SlotWindow> slots(Schedule schedule, int days) {
        return SlotCalculator.generate(schedule.getSlotMinutes(), schedule.getLeadTimeMinutes(),
                schedule.getOpeningHours(), zoneId(), clock.instant(), Math.min(days, schedule.getHorizonDays()));
    }

    /** How many bookings each slot key has. */
    @Transactional(readOnly = true)
    public Map<String, Integer> booked(Collection<String> keys) {
        Map<String, Integer> result = new HashMap<>();
        if (keys.isEmpty()) {
            return result;
        }
        jdbc.sql("select slot_key, booked from slot_counters where slot_key in (:keys)").param("keys", keys)
                .query((rs, n) -> Map.entry(rs.getString(1), rs.getInt(2))).list()
                .forEach(e -> result.put(e.getKey(), e.getValue()));
        return result;
    }

    public static String slotKey(FulfillmentMethod method, UUID locationId, long epochSeconds) {
        return method == FulfillmentMethod.DELIVERY ? "D|" + epochSeconds : "P|" + locationId + "|" + epochSeconds;
    }

    public static String normalizePostcode(String postcode) {
        return postcode == null ? "" : postcode.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
    }
}
