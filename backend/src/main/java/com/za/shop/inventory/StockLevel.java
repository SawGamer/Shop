package com.za.shop.inventory;

import java.util.UUID;

public record StockLevel(UUID variantId, int onHand, int reserved, int available) {

    public static StockLevel of(UUID variantId, int onHand, int reserved) {
        return new StockLevel(variantId, onHand, reserved, Math.max(0, onHand - reserved));
    }

    public static StockLevel none(UUID variantId) {
        return new StockLevel(variantId, 0, 0, 0);
    }
}
