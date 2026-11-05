package com.za.shop.fulfillment.internal;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.za.shop.fulfillment.FulfillmentMethod;
import com.za.shop.fulfillment.internal.FulfillmentDtos.LocationDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.SlotDayDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.SlotDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.ZoneDto;
import com.za.shop.settings.ShopSettingsService;
import com.za.shop.shared.ApiException;

import io.swagger.v3.oas.annotations.tags.Tag;

/** Public side of local fulfillment: is the address served, which stores exist, which slots are free. */
@RestController
@RequestMapping("/api/v1/fulfillment")
@Tag(name = "Fulfillment")
class FulfillmentController {

    private final FulfillmentRules rules;
    private final ShopSettingsService settings;

    FulfillmentController(FulfillmentRules rules, ShopSettingsService settings) {
        this.rules = rules;
        this.settings = settings;
    }

    @GetMapping("/zone")
    ResponseEntity<ZoneDto> zone(@RequestParam String postcode) {
        requireLocal();
        Zone zone = rules.zoneFor(postcode).orElseThrow(() -> ApiException.notFound("Delivery area"));
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(java.time.Duration.ofSeconds(30)).cachePublic())
                .body(ZoneDto.of(zone));
    }

    @GetMapping("/locations")
    ResponseEntity<List<LocationDto>> locations() {
        requireLocal();
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(java.time.Duration.ofSeconds(30)).cachePublic())
                .body(rules.locations().stream().map(LocationDto::of)
                        .sorted(java.util.Comparator.comparing(LocationDto::name)).toList());
    }

    @GetMapping("/slots")
    ResponseEntity<List<SlotDayDto>> slots(@RequestParam FulfillmentMethod method,
            @RequestParam(required = false) String postcode, @RequestParam(required = false) UUID locationId,
            @RequestParam(defaultValue = "7") int days) {
        requireLocal();
        UUID location = null;
        if (method == FulfillmentMethod.DELIVERY) {
            if (postcode == null || rules.zoneFor(postcode).isEmpty()) {
                throw ApiException.badRequest("NOT_DELIVERABLE", "We don't deliver to this postcode").with("errors",
                        Map.of("postcode", "We don't deliver here yet"));
            }
        }
        else {
            location = rules.location(locationId == null ? new UUID(0, 0) : locationId)
                    .orElseThrow(() -> ApiException.notFound("Pickup store")).getId();
        }
        Schedule schedule = rules.schedule();
        var windows = rules.slots(schedule, Math.max(1, Math.min(days, 14)));
        final UUID loc = location;
        Map<String, String> keys = windows.stream().collect(Collectors.toMap(w -> String.valueOf(w.start().getEpochSecond()),
                w -> FulfillmentRules.slotKey(method, loc, w.start().getEpochSecond())));
        Map<String, Integer> booked = rules.booked(keys.values());

        Map<LocalDate, List<SlotDto>> byDay = new LinkedHashMap<>();
        for (SlotCalculator.SlotWindow w : windows) {
            String id = String.valueOf(w.start().getEpochSecond());
            int remaining = schedule.getCapacityPerSlot() - booked.getOrDefault(keys.get(id), 0);
            if (remaining > 0) {
                byDay.computeIfAbsent(w.start().atZone(rules.zoneId()).toLocalDate(), d -> new java.util.ArrayList<>())
                        .add(new SlotDto(id, w.start(), w.end(), remaining));
            }
        }
        List<SlotDayDto> result = byDay.entrySet().stream()
                .map(e -> new SlotDayDto(e.getKey().toString(), e.getValue())).toList();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result);
    }

    private void requireLocal() {
        if (!settings.isLocalFulfillment()) {
            throw ApiException.conflict("FULFILLMENT_DISABLED", "This shop delivers by parcel service");
        }
    }
}
