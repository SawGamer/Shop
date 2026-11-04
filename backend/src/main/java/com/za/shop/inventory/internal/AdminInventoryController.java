package com.za.shop.inventory.internal;

import java.util.UUID;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.za.shop.inventory.InventoryService;
import com.za.shop.inventory.StockLevel;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/v1/admin/inventory")
@Tag(name = "Admin: inventory")
class AdminInventoryController {

    record SetStockRequest(@NotNull @Min(0) @Max(1_000_000) Integer onHand) {
    }

    private final InventoryService inventory;

    AdminInventoryController(InventoryService inventory) {
        this.inventory = inventory;
    }

    @PutMapping("/{variantId}")
    StockLevel setStock(@PathVariable UUID variantId, @Valid @RequestBody SetStockRequest request) {
        return inventory.setOnHand(variantId, request.onHand());
    }
}
