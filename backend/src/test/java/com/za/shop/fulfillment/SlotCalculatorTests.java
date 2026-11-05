package com.za.shop.fulfillment;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.za.shop.fulfillment.internal.OpeningHours;
import com.za.shop.fulfillment.internal.SlotCalculator;

class SlotCalculatorTests {

    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

    private static OpeningHours hours(int day, String from, String to) {
        return new OpeningHours(day, LocalTime.parse(from), LocalTime.parse(to));
    }

    private static Instant at(String localDateTime) {
        return LocalDateTime.parse(localDateTime).atZone(BERLIN).toInstant();
    }

    private static List<String> starts(List<SlotCalculator.SlotWindow> slots) {
        return slots.stream().map(s -> s.start().atZone(BERLIN).toLocalTime().toString()).toList();
    }

    @Test
    void slotsFillTheOpeningWindowExactly() {
        // 2026-11-02 is a Monday
        var slots = SlotCalculator.generate(60, 0, List.of(hours(1, "08:00", "12:00")), BERLIN,
                at("2026-11-02T07:00:00"), 1);
        assertThat(starts(slots)).containsExactly("08:00", "09:00", "10:00", "11:00");
        assertThat(slots.getLast().end()).isEqualTo(at("2026-11-02T12:00:00"));
    }

    @Test
    void leadTimeHidesSlotsThatAreTooSoon() {
        var slots = SlotCalculator.generate(60, 60, List.of(hours(1, "08:00", "12:00")), BERLIN,
                at("2026-11-02T09:30:00"), 1);
        assertThat(starts(slots)).containsExactly("11:00"); // 10:00 starts before 10:30
    }

    @Test
    void onlyOpenWeekdaysHaveSlots() {
        var slots = SlotCalculator.generate(120, 0, List.of(hours(1, "08:00", "12:00"), hours(3, "14:00", "18:00")),
                BERLIN, at("2026-11-02T00:30:00"), 4);
        assertThat(slots).hasSize(4); // Monday 2 + Wednesday 2, nothing on Tuesday or Thursday
        assertThat(slots.get(2).start()).isEqualTo(at("2026-11-04T14:00:00"));
    }

    @Test
    void windowsShorterThanASlotProduceNothing() {
        assertThat(SlotCalculator.generate(60, 0, List.of(hours(1, "08:00", "08:45")), BERLIN,
                at("2026-11-02T00:00:00"), 1)).isEmpty();
    }

    @Test
    void overlappingWindowsDoNotDuplicateSlots() {
        var slots = SlotCalculator.generate(60, 0, List.of(hours(1, "08:00", "10:00"), hours(1, "09:00", "11:00")),
                BERLIN, at("2026-11-02T00:00:00"), 1);
        assertThat(starts(slots)).containsExactly("08:00", "09:00", "10:00");
    }

    @Test
    void slotsAreInTheShopsTimeZoneAcrossTheSpringClockChange() {
        // 2026-03-29 is the Sunday the clocks go forward in Berlin; 08:00 is already CEST (UTC+2).
        var slots = SlotCalculator.generate(60, 0, List.of(hours(7, "08:00", "10:00")), BERLIN,
                at("2026-03-29T00:30:00"), 1);
        assertThat(slots.getFirst().start()).isEqualTo(Instant.parse("2026-03-29T06:00:00Z"));
        // A week earlier it is still CET (UTC+1).
        var before = SlotCalculator.generate(60, 0, List.of(hours(7, "08:00", "10:00")), BERLIN,
                at("2026-03-22T00:30:00"), 1);
        assertThat(before.getFirst().start()).isEqualTo(Instant.parse("2026-03-22T07:00:00Z"));
    }
}
