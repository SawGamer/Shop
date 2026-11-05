package com.za.shop.fulfillment.internal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;


import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Request and response shapes of the fulfillment API (see docs/api.md). */
public final class FulfillmentDtos {

    private FulfillmentDtos() {
    }

    public record ZoneDto(UUID id, String name, List<String> postcodePrefixes, long feeCents, Long freeFromCents,
            long minOrderCents) {
        static ZoneDto of(Zone zone) {
            return new ZoneDto(zone.getId(), zone.getName(), zone.getPostcodePrefixes().stream().sorted().toList(),
                    zone.getFeeCents(), zone.getFreeFromCents(), zone.getMinOrderCents());
        }
    }

    public record AddressDto(String fullName, String line1, String line2, String postalCode, String city,
            String country, String phone) {
    }

    public record LocationDto(UUID id, String name, AddressDto address, String openingHours) {
        static LocationDto of(Location l) {
            return new LocationDto(l.getId(), l.getName(), new AddressDto(l.getName(), l.getLine1(), l.getLine2(),
                    l.getPostalCode(), l.getCity(), l.getCountry(), l.getPhone()), l.getOpeningHours());
        }
    }

    public record SlotDto(String id, Instant startsAt, Instant endsAt, int remaining) {
    }

    public record SlotDayDto(String date, List<SlotDto> slots) {
    }

    public record OpeningHoursDto(int dayOfWeek, String from, String to) {
    }

    public record ScheduleDto(int slotMinutes, int capacityPerSlot, int leadTimeMinutes, int horizonDays,
            List<OpeningHoursDto> openingHours) {
    }

    public record AdminFulfillmentDto(String mode, String timeZone, List<ZoneDto> zones, List<LocationDto> locations,
            ScheduleDto schedule) {
    }

    public record ModeRequest(@NotBlank @Pattern(regexp = "^(SHIPPING|LOCAL)$", message = "must be SHIPPING or LOCAL") String mode) {
    }

    public record ZoneUpsert(
            @NotBlank @Size(max = 80) String name,
            @NotEmpty @Size(max = 50) List<@NotBlank @Pattern(regexp = "^[A-Za-z0-9]{1,10}$", message = "letters and digits only") String> postcodePrefixes,
            @NotNull @Min(0) @Max(100_000) Long feeCents,
            @Min(0) @Max(10_000_000) Long freeFromCents,
            @NotNull @Min(0) @Max(10_000_000) Long minOrderCents) {
    }

    public record AddressInput(
            @Size(max = 120) String fullName,
            @NotBlank @Size(max = 160) String line1,
            @Size(max = 160) String line2,
            @NotBlank @Size(max = 20) String postalCode,
            @NotBlank @Size(max = 80) String city,
            @NotBlank @Pattern(regexp = "^[A-Z]{2}$", message = "must be an ISO-3166 alpha-2 code like DE") String country,
            @Size(max = 40) String phone) {
    }

    public record LocationUpsert(
            @NotBlank @Size(max = 80) String name,
            @NotNull @Valid AddressInput address,
            @Size(max = 300) String openingHours) {
    }

    public record OpeningHoursInput(
            @Min(1) @Max(7) int dayOfWeek,
            @NotBlank @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "must look like 08:00") String from,
            @NotBlank @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "must look like 20:00") String to) {
    }

    public record ScheduleUpsert(
            @Min(30) @Max(240) int slotMinutes,
            @Min(1) @Max(500) int capacityPerSlot,
            @Min(0) @Max(10_080) int leadTimeMinutes,
            @Min(1) @Max(14) int horizonDays,
            @NotNull @Size(max = 50) List<@NotNull @Valid OpeningHoursInput> openingHours) {
    }
}
