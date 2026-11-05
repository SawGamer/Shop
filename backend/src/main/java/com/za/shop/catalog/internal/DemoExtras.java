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

    /** Running deals, by product name. They end a few days after the demo data was created. */
    static final Map<String, DemoDeal> DEALS = Map.of(
            "Nordbyte Air 14 laptop", new DemoDeal(10, Duration.ofDays(3)),
            "Lumen Studio headphones", new DemoDeal(20, Duration.ofDays(1)),
            "Orbit Watch S", new DemoDeal(15, Duration.ofDays(7)));
}
