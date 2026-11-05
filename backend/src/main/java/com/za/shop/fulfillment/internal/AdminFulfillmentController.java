package com.za.shop.fulfillment.internal;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.za.shop.fulfillment.internal.FulfillmentDtos.AdminFulfillmentDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.LocationDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.LocationUpsert;
import com.za.shop.fulfillment.internal.FulfillmentDtos.ModeRequest;
import com.za.shop.fulfillment.internal.FulfillmentDtos.ScheduleDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.ScheduleUpsert;
import com.za.shop.fulfillment.internal.FulfillmentDtos.ZoneDto;
import com.za.shop.fulfillment.internal.FulfillmentDtos.ZoneUpsert;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/admin/fulfillment")
@Tag(name = "Admin: fulfillment")
class AdminFulfillmentController {

    private final FulfillmentAdminService admin;

    AdminFulfillmentController(FulfillmentAdminService admin) {
        this.admin = admin;
    }

    @GetMapping
    AdminFulfillmentDto overview() {
        return admin.overview();
    }

    @PutMapping("/mode")
    Map<String, String> setMode(@Valid @RequestBody ModeRequest request) {
        return Map.of("mode", admin.setMode(request.mode()));
    }

    @PostMapping("/zones")
    @ResponseStatus(HttpStatus.CREATED)
    ZoneDto createZone(@Valid @RequestBody ZoneUpsert request) {
        return admin.createZone(request);
    }

    @PutMapping("/zones/{id}")
    ZoneDto updateZone(@PathVariable UUID id, @Valid @RequestBody ZoneUpsert request) {
        return admin.updateZone(id, request);
    }

    @DeleteMapping("/zones/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteZone(@PathVariable UUID id) {
        admin.deleteZone(id);
    }

    @PostMapping("/locations")
    @ResponseStatus(HttpStatus.CREATED)
    LocationDto createLocation(@Valid @RequestBody LocationUpsert request) {
        return admin.createLocation(request);
    }

    @PutMapping("/locations/{id}")
    LocationDto updateLocation(@PathVariable UUID id, @Valid @RequestBody LocationUpsert request) {
        return admin.updateLocation(id, request);
    }

    @DeleteMapping("/locations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteLocation(@PathVariable UUID id) {
        admin.deleteLocation(id);
    }

    @PutMapping("/schedule")
    ScheduleDto updateSchedule(@Valid @RequestBody ScheduleUpsert request) {
        return admin.updateSchedule(request);
    }
}
