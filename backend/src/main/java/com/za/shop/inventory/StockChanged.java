package com.za.shop.inventory;

import java.util.Set;
import java.util.UUID;

/** Availability of these variants changed (stock edited, reserved, sold or released). */
public record StockChanged(Set<UUID> variantIds) {

    public StockChanged {
        variantIds = Set.copyOf(variantIds);
    }
}
