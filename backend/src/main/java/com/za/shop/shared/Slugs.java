package com.za.shop.shared;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Turns names like "Über Runner 2" into URL slugs like "uber-runner-2". */
public final class Slugs {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");
    private static final Pattern EDGE_DASHES = Pattern.compile("(^-+)|(-+$)");
    public static final Pattern VALID = Pattern.compile("^[a-z0-9]+(?:-[a-z0-9]+)*$");

    private Slugs() {
    }

    public static String slugify(String input) {
        if (input == null) {
            return "";
        }
        String normalized = Normalizer.normalize(input.replace("ß", "ss"), Normalizer.Form.NFD);
        String ascii = DIACRITICS.matcher(normalized).replaceAll("");
        String dashed = NON_ALNUM.matcher(ascii.toLowerCase(Locale.ROOT)).replaceAll("-");
        String slug = EDGE_DASHES.matcher(dashed).replaceAll("");
        return slug.length() > 150 ? slug.substring(0, 150).replaceAll("-+$", "") : slug;
    }

    /** Uses the explicit slug when given (after normalising it), otherwise derives one from the name. */
    public static String fromOptional(String explicitSlug, String name) {
        String slug = slugify(explicitSlug == null || explicitSlug.isBlank() ? name : explicitSlug);
        if (slug.isEmpty()) {
            throw ApiException.badRequest("VALIDATION_FAILED", "Could not derive a slug from '" + name + "'");
        }
        return slug;
    }
}
