package com.za.shop.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

class OptionOrderTests {

    @Test
    void sortsQuantitiesAcrossUnits() {
        assertThat(OptionOrder.arrange(List.of("44", "38", "42.5"))).containsExactly("38", "42.5", "44");
        assertThat(OptionOrder.arrange(List.of("1 TB", "256 GB", "512 GB"))).containsExactly("256 GB", "512 GB", "1 TB");
        assertThat(OptionOrder.arrange(List.of("1 kg", "250 g"))).containsExactly("250 g", "1 kg");
        assertThat(OptionOrder.arrange(List.of("1 l", "500 ml"))).containsExactly("500 ml", "1 l");
        assertThat(OptionOrder.arrange(List.of("8 pack", "4 pack"))).containsExactly("4 pack", "8 pack");
        assertThat(OptionOrder.arrange(List.of("200 × 300 cm", "160 × 230 cm")))
                .containsExactly("160 × 230 cm", "200 × 300 cm");
    }

    @Test
    void keepsShopOrderForWordsAndMixedValues() {
        assertThat(OptionOrder.arrange(List.of("Single", "Double", "King"))).containsExactly("Single", "Double", "King");
        assertThat(OptionOrder.arrange(List.of("Small", "250 g"))).containsExactly("Small", "250 g");
    }

    @Test
    void comparatorPutsQuantitiesBeforeWords() {
        assertThat(List.of("Large", "1 kg", "Small", "250 g").stream().sorted(OptionOrder.COMPARATOR).toList())
                .containsExactly("250 g", "1 kg", "Large", "Small");
    }
}
