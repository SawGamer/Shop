package com.za.shop.fulfillment.internal;

import java.time.Clock;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.fulfillment.internal.FulfillmentDtos.AdminFulfillmentDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.LocationDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.LocationUpsert;
import com.za.shop.fulfillment.internal.FulfillmentDtos.OpeningHoursDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.OpeningHoursInput;
import com.za.shop.fulfillment.internal.FulfillmentDtos.ScheduleDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.ScheduleUpsert;
import com.za.shop.fulfillment.internal.FulfillmentDtos.ZoneDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.ZoneUpsert;
import com.za.shop.settings.FulfillmentMode;
import com.za.shop.settings.ShopSettingsService;
import com.za.shop.shared.ApiException;
import com.za.shop.shared.ShopProperties;

@Service
@Transactional
class FulfillmentAdminService {

    private final FulfillmentRules rules;
    private final ZoneRepository zones;
    private final LocationRepository locations;
    private final ShopSettingsService settings;
    private final ShopProperties shop;
    private final Clock clock;

    FulfillmentAdminService(FulfillmentRules rules, ZoneRepository zones, LocationRepository locations,
            ShopSettingsService settings, ShopProperties shop, Clock clock) {
        this.rules = rules;
        this.zones = zones;
        this.locations = locations;
        this.settings = settings;
        this.shop = shop;
        this.clock = clock;
    }

    AdminFulfillmentDto overview() {
        return new AdminFulfillmentDto(settings.current().fulfillmentMode(), shop.timeZone(),
                zones.findAll().stream().map(ZoneDto::of).sorted(java.util.Comparator.comparing(ZoneDto::name)).toList(),
                locations.findAll().stream().map(LocationDto::of)
                        .sorted(java.util.Comparator.comparing(LocationDto::name)).toList(),
                scheduleDto(rules.schedule()));
    }

    String setMode(String mode) {
        return settings.setFulfillmentMode(FulfillmentMode.valueOf(mode)).fulfillmentMode();
    }

    ZoneDto createZone(ZoneUpsert request) {
        return ZoneDto.of(zones.save(new Zone(request.name().trim(), prefixes(request), request.feeCents(),
                request.freeFromCents(), request.minOrderCents(), clock.instant())));
    }

    ZoneDto updateZone(UUID id, ZoneUpsert request) {
        Zone zone = zones.findById(id).orElseThrow(() -> ApiException.notFound("Zone"));
        zone.update(request.name().trim(), prefixes(request), request.feeCents(), request.freeFromCents(),
                request.minOrderCents());
        return ZoneDto.of(zone);
    }

    void deleteZone(UUID id) {
        zones.delete(zones.findById(id).orElseThrow(() -> ApiException.notFound("Zone")));
    }

    LocationDto createLocation(LocationUpsert request) {
        var a = request.address();
        return LocationDto.of(locations.save(new Location(request.name().trim(), a.line1().trim(), blank(a.line2()),
                a.postalCode().trim(), a.city().trim(), a.country(), blank(a.phone()), request.openingHours(),
                clock.instant())));
    }

    LocationDto updateLocation(UUID id, LocationUpsert request) {
        Location location = locations.findById(id).orElseThrow(() -> ApiException.notFound("Location"));
        var a = request.address();
        location.update(request.name().trim(), a.line1().trim(), blank(a.line2()), a.postalCode().trim(),
                a.city().trim(), a.country(), blank(a.phone()), request.openingHours());
        return LocationDto.of(location);
    }

    void deleteLocation(UUID id) {
        locations.delete(locations.findById(id).orElseThrow(() -> ApiException.notFound("Location")));
    }

    ScheduleDto updateSchedule(ScheduleUpsert request) {
        List<OpeningHours> hours = request.openingHours().stream().map(this::hours).toList();
        Schedule schedule = rules.schedule();
        schedule.update(request.slotMinutes(), request.capacityPerSlot(), request.leadTimeMinutes(),
                request.horizonDays(), hours);
        return scheduleDto(schedule);
    }

    private OpeningHours hours(OpeningHoursInput input) {
        LocalTime from = LocalTime.parse(input.from());
        LocalTime to = LocalTime.parse(input.to());
        if (!to.isAfter(from)) {
            throw ApiException.badRequest("VALIDATION_FAILED", "Opening hours must end after they start")
                    .with("errors", Map.of("openingHours", "'" + input.to() + "' must be after '" + input.from() + "'"));
        }
        return new OpeningHours(input.dayOfWeek(), from, to);
    }

    private static ScheduleDto scheduleDto(Schedule s) {
        return new ScheduleDto(s.getSlotMinutes(), s.getCapacityPerSlot(), s.getLeadTimeMinutes(), s.getHorizonDays(),
                s.getOpeningHours().stream()
                        .sorted(java.util.Comparator.comparingInt(OpeningHours::dayOfWeek)
                                .thenComparing(OpeningHours::fromTime))
                        .map(h -> new OpeningHoursDto(h.dayOfWeek(), h.fromTime().toString(), h.toTime().toString()))
                        .toList());
    }

    private static java.util.Set<String> prefixes(ZoneUpsert request) {
        java.util.Set<String> result = new HashSet<>();
        request.postcodePrefixes().forEach(p -> result.add(p.trim().toUpperCase(Locale.ROOT)));
        return result;
    }

    private static String blank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
