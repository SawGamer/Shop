package com.za.shop.settings;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * The storefront designs a shop can use. The backend only stores the choice; each design's look lives in
 * the storefront ({@code storefront/lib/themes}).
 */
public enum Theme {
    FOOTWEAR,
    ELECTRONICS,
    GROCERY,
    HOME,
    BEAUTY;

    public String id() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static Optional<Theme> fromId(String id) {
        if (id == null) {
            return Optional.empty();
        }
        return Arrays.stream(values()).filter(t -> t.id().equals(id.trim().toLowerCase(Locale.ROOT))).findFirst();
    }
}
