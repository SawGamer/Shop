package com.za.shop.catalog.internal;

import java.util.Comparator;
import java.util.Optional;

/** Sizes sort numerically when they are numbers ("38" < "42.5" < "44"), otherwise alphabetically. */
public final class Sizes {

    public static final Comparator<String> ORDER = Comparator
            .comparing((String s) -> parse(s).isEmpty())
            .thenComparing(s -> parse(s).orElse(0.0))
            .thenComparing(Comparator.naturalOrder());

    private Sizes() {
    }

    private static Optional<Double> parse(String value) {
        try {
            return Optional.of(Double.parseDouble(value.replace(',', '.')));
        }
        catch (NumberFormatException e) {
            return Optional.empty();
        }
    }
}
