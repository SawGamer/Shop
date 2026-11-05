package com.za.shop.fulfillment.internal;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Turns the schedule into concrete slots. Pure, so it is easy to test. */
public final class SlotCalculator {

    public record SlotWindow(Instant start, Instant end) {
    }

    private SlotCalculator() {
    }

    /**
     * All slots starting no earlier than {@code now + leadTime}, within the next {@code days} days
     * (counted from today in the shop's time zone), earliest first.
     */
    public static List<SlotWindow> generate(int slotMinutes, int leadTimeMinutes, List<OpeningHours> hours,
            ZoneId zone, Instant now, int days) {
        Instant earliest = now.plusSeconds(leadTimeMinutes * 60L);
        LocalDate today = now.atZone(zone).toLocalDate();
        List<SlotWindow> slots = new ArrayList<>();
        for (int d = 0; d < days; d++) {
            LocalDate date = today.plusDays(d);
            for (OpeningHours window : hours) {
                if (window.dayOfWeek() != date.getDayOfWeek().getValue()) {
                    continue;
                }
                LocalTime t = window.fromTime();
                while (true) {
                    LocalTime end = t.plusMinutes(slotMinutes);
                    if (!end.isAfter(t) || end.isAfter(window.toTime())) {
                        break; // wrapped past midnight or beyond closing time
                    }
                    Instant start = ZonedDateTime.of(date, t, zone).toInstant();
                    if (!start.isBefore(earliest)) {
                        slots.add(new SlotWindow(start, start.plusSeconds(slotMinutes * 60L)));
                    }
                    t = end;
                }
            }
        }
        return slots.stream().sorted(Comparator.comparing(SlotWindow::start)).distinct().toList();
    }
}
