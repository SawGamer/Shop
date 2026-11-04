package com.za.shop.inventory;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;

import com.za.shop.shared.ApiException;

public class InsufficientStockException extends ApiException {

    public record Shortage(UUID variantId, int requested, int available) {
    }

    private final List<Shortage> shortages;

    public InsufficientStockException(List<Shortage> shortages) {
        super(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK", shortages.size() == 1
                ? "Only " + shortages.getFirst().available() + " left in stock"
                : "Some items are no longer available in the requested quantity");
        this.shortages = List.copyOf(shortages);
        with("items", this.shortages);
    }

    public List<Shortage> shortages() {
        return shortages;
    }
}
