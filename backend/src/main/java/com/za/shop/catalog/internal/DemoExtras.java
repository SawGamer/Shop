package com.za.shop.catalog.internal;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import com.za.shop.catalog.internal.CatalogDtos.SpecInput;

/**
 * Specifications and deals for the demo catalogs. Spec labels are shared between product types
 * ("Screen size" for phones and laptops alike) so that the same filter works across them.
 */
final class DemoExtras {

    record DemoDeal(int percentOff, Duration endsIn) {
    }

    private DemoExtras() {
    }

    private static SpecInput spec(String group, String label, String value, boolean filterable) {
        return new SpecInput(group, label, value, filterable);
    }

    private static List<SpecInput> phone(String screen, String ram, String battery, String camera) {
        return List.of(
                spec("Display", "Screen size", screen, true),
                spec("Display", "Panel", "OLED, 120 Hz", false),
                spec("Performance", "RAM", ram, true),
                spec("Performance", "Chip", "Voltix V3", false),
                spec("Camera", "Main camera", camera, true),
                spec("Battery", "Battery", battery, true),
                spec("Connectivity", "Network", "5G", true),
                spec("Connectivity", "Water resistance", "IP68", false));
    }

    private static List<SpecInput> laptop(String screen, String ram, String weight, String battery) {
        return List.of(
                spec("Display", "Screen size", screen, true),
                spec("Display", "Resolution", screen.startsWith("14") ? "2880 × 1800" : "3456 × 2160", false),
                spec("Performance", "RAM", ram, true),
                spec("Performance", "Processor", "Nordbyte N2 (8 cores)", false),
                spec("Design", "Weight", weight, false),
                spec("Battery", "Battery life", battery, true));
    }

    static final Map<String, List<SpecInput>> SPECS = Map.ofEntries(
            Map.entry("Voltix One smartphone", phone("6.4″", "8 GB", "5000 mAh", "50 MP")),
            Map.entry("Voltix One Mini", phone("5.8″", "6 GB", "3900 mAh", "50 MP")),
            Map.entry("Nordbyte Air 14 laptop", laptop("14″", "16 GB", "1.2 kg", "18 h")),
            Map.entry("Nordbyte Pro 16 laptop", laptop("16″", "32 GB", "2.1 kg", "22 h")),
            Map.entry("Nordbyte Tab 11", List.of(
                    spec("Display", "Screen size", "11″", true),
                    spec("Display", "Panel", "Laminated LCD, 120 Hz", false),
                    spec("Performance", "RAM", "6 GB", true),
                    spec("Battery", "Battery life", "12 h", true),
                    spec("Connectivity", "Pen support", "Yes", false))),
            Map.entry("Lumen Studio headphones", List.of(
                    spec("Audio", "Type", "Over-ear", true),
                    spec("Audio", "Noise cancelling", "Adaptive", true),
                    spec("Battery", "Battery life", "40 h", true),
                    spec("Connectivity", "Bluetooth", "5.3", false))),
            Map.entry("Lumen Buds Pro", List.of(
                    spec("Audio", "Type", "In-ear", true),
                    spec("Audio", "Noise cancelling", "Adaptive", true),
                    spec("Battery", "Battery life", "8 h", true),
                    spec("Connectivity", "Bluetooth", "5.3", false),
                    spec("Design", "Water resistance", "IPX4", false))),
            Map.entry("Lumen Boom speaker", List.of(
                    spec("Audio", "Type", "Portable speaker", true),
                    spec("Battery", "Battery life", "20 h", true),
                    spec("Design", "Water resistance", "IP67", true),
                    spec("Connectivity", "Bluetooth", "5.3", false))),
            Map.entry("Orbit Watch S", List.of(
                    spec("Display", "Screen size", "1.9″", true),
                    spec("Display", "Panel", "Always-on AMOLED", false),
                    spec("Battery", "Battery life", "7 days", true),
                    spec("Design", "Case", "Titanium", false),
                    spec("Design", "Water resistance", "5 ATM", false))),
            Map.entry("Orbit Band fitness tracker", List.of(
                    spec("Display", "Screen size", "1.1″", true),
                    spec("Battery", "Battery life", "14 days", true),
                    spec("Design", "Water resistance", "5 ATM", false))),
            Map.entry("Orbit Home Hub", List.of(
                    spec("Display", "Screen size", "8″", true),
                    spec("Audio", "Type", "Smart display", true),
                    spec("Connectivity", "Wi-Fi", "Wi-Fi 6", false))),
            Map.entry("Voltix PowerCube 30W charger", List.of(
                    spec("Power", "Output", "30 W", true),
                    spec("Power", "Ports", "1 × USB-C", false),
                    spec("Design", "Technology", "GaN", false))));

    /** Prices that differ by size (book formats, box sizes), in cents, by product name and size. */
    static final Map<String, Map<String, Long>> SIZE_PRICES = Map.ofEntries(
            Map.entry("The Salt Road", Map.of("Paperback", 1499L, "Hardcover", 2299L, "E-book", 999L)),
            Map.entry("Midnight at Harbour Nine", Map.of("Paperback", 1399L, "E-book", 899L)),
            Map.entry("Orbit of Quiet Stars", Map.of("Paperback", 1599L, "Hardcover", 2499L, "E-book", 1099L)),
            Map.entry("Letters from the Vineyard", Map.of("Paperback", 1399L, "Hardcover", 2199L)),
            Map.entry("The Glass Archipelago", Map.of("Paperback", 1499L, "E-book", 999L)),
            Map.entry("A Short History of Bridges", Map.of("Hardcover", 2999L, "Paperback", 1899L)),
            Map.entry("The Roman Table", Map.of("Hardcover", 3200L, "Paperback", 1999L)),
            Map.entry("How Small Habits Win", Map.of("Paperback", 1699L, "E-book", 1199L)),
            Map.entry("One-Pan Weeknights", Map.of("Paperback", 2499L, "E-book", 1499L)),
            Map.entry("Pip and the Moon Door", Map.of("Hardcover", 1599L, "Paperback", 999L)),
            Map.entry("The Secret of Fox Hollow", Map.of("Paperback", 899L, "Hardcover", 1499L)),
            Map.entry("Signature praline box", Map.of("Box of 9", 1900L, "Box of 16", 3200L, "Box of 25", 4600L)),
            Map.entry("Hazelnut chocolate spread", Map.of("250 g", 699L, "400 g", 999L)),
            Map.entry("Triple chocolate cake", Map.of("Slice", 450L, "Whole cake", 3400L)),
            Map.entry("Macaron box", Map.of("Box of 6", 1200L, "Box of 12", 2200L)),
            Map.entry("New York cheesecake", Map.of("Slice", 480L, "Whole cake", 3600L)),
            Map.entry("Cinnamon rolls", Map.of("4 pack", 1000L, "8 pack", 1800L)),
            Map.entry("Wood-fired pizza", Map.of("Single", 1190L, "Family", 1790L)),
            Map.entry("Lasagne al forno", Map.of("Single", 1190L, "Family", 2490L)),
            Map.entry("Tiramisu cups", Map.of("2 pack", 790L, "4 pack", 1490L)),
            Map.entry("Seasonal berry tart", Map.of("Slice", 450L, "Whole tart", 3200L)));

    /** "Was" prices that apply to one size only, in cents, by product name and size. */
    static final Map<String, Map<String, Long>> SIZE_COMPARE_AT = Map.of(
            "Midnight at Harbour Nine", Map.of("Paperback", 1599L),
            "Cinnamon rolls", Map.of("8 pack", 2000L));

    /** Running deals, by product name. They end a few days after the demo data was created. */
    static final Map<String, DemoDeal> DEALS = Map.of(
            "Nordbyte Air 14 laptop", new DemoDeal(10, Duration.ofDays(3)),
            "Lumen Studio headphones", new DemoDeal(20, Duration.ofDays(1)),
            "Orbit Watch S", new DemoDeal(15, Duration.ofDays(7)));
}
