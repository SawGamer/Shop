package com.za.shop.settings;

import java.time.Instant;

/**
 * @param theme       one of the {@link Theme} ids, e.g. {@code "grocery"}
 * @param accentColor {@code #RRGGBB} overriding the design's accent colour, or null
 */
public record ShopSettingsView(String name, String tagline, String theme, String accentColor, String logoUrl,
        String currency, Instant updatedAt, String fulfillmentMode, String timeZone) {
}
