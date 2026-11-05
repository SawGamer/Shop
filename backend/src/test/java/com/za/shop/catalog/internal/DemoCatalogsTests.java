package com.za.shop.catalog.internal;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;

import com.za.shop.settings.Theme;
import com.za.shop.shared.Slugs;

/** Catches typos in the demo data before they surface as a failed start-up. */
class DemoCatalogsTests {

    @ParameterizedTest
    @ValueSource(strings = { "footwear", "electronics", "grocery", "home", "beauty", "sports", "books", "gourmet" })
    void catalogIsConsistent(String id) {
        DemoCatalogs.Catalog catalog = DemoCatalogs.get(id);
        assertThat(Theme.fromId(id)).as("every demo catalog has a matching design").isPresent();

        Set<String> slugs = new HashSet<>();
        for (DemoCatalogs.Category category : catalog.categories()) {
            assertThat(category.slug()).matches(Slugs.VALID);
            if (category.parentSlug() != null) {
                assertThat(slugs).as("parent of %s is declared first", category.slug()).contains(category.parentSlug());
            }
            assertThat(slugs.add(category.slug())).as("unique category slug %s", category.slug()).isTrue();
        }

        Set<String> names = new HashSet<>();
        for (DemoCatalogs.Product product : catalog.products()) {
            assertThat(names.add(product.name())).as("unique product %s", product.name()).isTrue();
            assertThat(catalog.brands()).contains(product.brand());
            assertThat(slugs).contains(product.category());
            assertThat(product.priceCents()).isPositive();
            if (product.compareAtCents() != null) {
                assertThat(product.compareAtCents()).isGreaterThan(product.priceCents());
            }
            String image = String.format("seed/%s/%02d.jpg", id, product.image());
            assertThat(new ClassPathResource(image).exists()).as("image %s exists", image).isTrue();
        }
    }
}
