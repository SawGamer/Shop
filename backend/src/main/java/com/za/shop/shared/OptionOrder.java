package com.za.shop.shared;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Orders variant option values the way shoppers expect, for any kind of shop: "38" < "42.5",
 * "500 g" < "1 kg", "256 GB" < "1 TB", "30 ml" < "1 l", "4 pack" < "8 pack". Values that are not
 * quantities ("Small", "King", "Midnight") keep the order the shop entered them in.
 */
public final class OptionOrder {

    private static final Pattern QUANTITY = Pattern.compile(
            "^\\s*(\\d+(?:[.,]\\d+)?)\\s*([a-zA-Zµ]+)?(?![a-zA-Z]).*$");

    record Quantity(String dimension, double base) {
    }

    /** Quantities first (grouped by dimension, smallest first), then everything else alphabetically. */
    public static final Comparator<String> COMPARATOR = (a, b) -> {
        Optional<Quantity> qa = parse(a);
        Optional<Quantity> qb = parse(b);
        if (qa.isPresent() && qb.isPresent()) {
            int byDimension = qa.get().dimension().compareTo(qb.get().dimension());
            if (byDimension != 0) {
                return byDimension;
            }
            int byValue = Double.compare(qa.get().base(), qb.get().base());
            return byValue != 0 ? byValue : a.compareToIgnoreCase(b);
        }
        if (qa.isPresent()) {
            return -1;
        }
        if (qb.isPresent()) {
            return 1;
        }
        return a.compareToIgnoreCase(b);
    };

    private OptionOrder() {
    }

    /**
     * @param valuesInShopOrder distinct values in the order the shop defined its variants
     * @return the values sorted by quantity when every value is a quantity, otherwise unchanged
     */
    public static List<String> arrange(List<String> valuesInShopOrder) {
        if (!valuesInShopOrder.isEmpty() && valuesInShopOrder.stream().allMatch(v -> parse(v).isPresent())) {
            return valuesInShopOrder.stream().sorted(COMPARATOR).toList();
        }
        return List.copyOf(valuesInShopOrder);
    }

    static Optional<Quantity> parse(String value) {
        if (value == null) {
            return Optional.empty();
        }
        Matcher m = QUANTITY.matcher(value);
        if (!m.matches()) {
            return Optional.empty();
        }
        double number = Double.parseDouble(m.group(1).replace(',', '.'));
        String unit = m.group(2) == null ? "" : m.group(2).toLowerCase(Locale.ROOT);
        return Optional.of(switch (unit) {
            case "" -> new Quantity("", number);
            case "mg" -> new Quantity("mass", number / 1000);
            case "g" -> new Quantity("mass", number);
            case "kg" -> new Quantity("mass", number * 1000);
            case "ml" -> new Quantity("volume", number);
            case "cl" -> new Quantity("volume", number * 10);
            case "l" -> new Quantity("volume", number * 1000);
            case "mb" -> new Quantity("data", number / 1024);
            case "gb" -> new Quantity("data", number);
            case "tb" -> new Quantity("data", number * 1024);
            case "mm" -> new Quantity("length", number);
            case "cm" -> new Quantity("length", number * 10);
            case "m" -> new Quantity("length", number * 1000);
            case "pack", "pcs", "pc", "x" -> new Quantity("count", number);
            default -> new Quantity("unit:" + unit, number);
        });
    }
}
