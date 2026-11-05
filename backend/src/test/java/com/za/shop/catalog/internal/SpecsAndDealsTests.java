package com.za.shop.catalog.internal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Random;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import com.za.shop.IntegrationTest;

class SpecsAndDealsTests extends IntegrationTest {

    @Autowired
    DealBoundaryJob dealJob;

    private static String randomWord() {
        return "zq" + new Random().ints(10, 'a', 'z' + 1)
                .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append);
    }

    private void putSpecs(Session admin, String productId, String json) throws Exception {
        mvc.perform(put("/api/v1/admin/products/{id}/specs", productId).header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isOk());
    }

    private void putDeal(Session admin, String productId, int percent, Instant starts, Instant ends) throws Exception {
        mvc.perform(put("/api/v1/admin/products/{id}/deal", productId).header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"percentOff":%d,"startsAt":"%s","endsAt":"%s"}""".formatted(percent, starts, ends)))
                .andExpect(status().isOk());
    }

    private static String spec(String group, String label, String value, boolean filterable) {
        return "{\"group\":%s,\"label\":\"%s\",\"value\":\"%s\",\"filterable\":%s}"
                .formatted(group == null ? "null" : "\"" + group + "\"", label, value, filterable);
    }

    @Test
    void specsAreStoredInOrderAndValidated() throws Exception {
        Session admin = admin();
        var product = createProduct(admin, unique("Phone"), 50000, 3, "128 GB");
        putSpecs(admin, product.id(), "{\"specs\":[" + spec("Display", "Screen size", "6.4″", true) + ","
                + spec("Performance", "RAM", "8 GB", true) + "," + spec(null, "Weight", "180 g", false) + "]}");

        mvc.perform(get("/api/v1/products/{slug}", product.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.specs[*].key").value(contains("screen_size", "ram", "weight")))
                .andExpect(jsonPath("$.specs[0].group").value("Display"))
                .andExpect(jsonPath("$.specs[2].group").value(nullValue()))
                .andExpect(jsonPath("$.specs[1].filterable").value(true))
                .andExpect(jsonPath("$.deal").value(nullValue()));

        // Replacing the specs replaces all of them.
        putSpecs(admin, product.id(), "{\"specs\":[" + spec("Display", "Screen size", "6.7″", true) + "]}");
        mvc.perform(get("/api/v1/products/{slug}", product.slug()))
                .andExpect(jsonPath("$.specs.length()").value(1))
                .andExpect(jsonPath("$.specs[0].value").value("6.7″"));

        // The same label twice would make one key ambiguous.
        mvc.perform(put("/api/v1/admin/products/{id}/specs", product.id()).header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"specs\":[" + spec("A", "RAM", "8 GB", true) + ","
                        + spec("B", "ram", "16 GB", true) + "]}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        mvc.perform(put("/api/v1/admin/products/{id}/specs", product.id()).header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"specs\":[" + spec(null, "", "x", false) + "]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/admin/products/{id}/specs", product.id())
                .header("Authorization", register(uniqueEmail()).bearer()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"specs\":[]}")).andExpect(status().isForbidden());
    }

    @Test
    void specFiltersAreDisjunctiveAndHighlightsAreShown() throws Exception {
        Session admin = admin();
        String word = randomWord();
        var a = createProduct(admin, word + " Alpha", 60000, 2, "128 GB");
        var b = createProduct(admin, word + " Bravo", 70000, 2, "128 GB");
        var c = createProduct(admin, word + " Charlie", 50000, 2, "128 GB");
        putSpecs(admin, a.id(), "{\"specs\":[" + spec("Display", "Screen size", "6.4″", true) + ","
                + spec("Performance", "RAM", "8 GB", true) + "]}");
        putSpecs(admin, b.id(), "{\"specs\":[" + spec("Display", "Screen size", "6.4″", true) + ","
                + spec("Performance", "RAM", "16 GB", true) + "]}");
        putSpecs(admin, c.id(), "{\"specs\":[" + spec("Display", "Screen size", "5.8″", true) + ","
                + spec("Performance", "RAM", "8 GB", true) + "," + spec(null, "Weight", "150 g", false) + "]}");

        await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> mvc.perform(get("/api/v1/products").param("q", word))
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.facets.specs[?(@.key=='ram')].values[*].count").exists())
                .andExpect(jsonPath("$.items[?(@.slug=='" + a.slug() + "')].highlights[0]").value(contains("6.4″ Screen size"))));

        MvcResult all = mvc.perform(get("/api/v1/products").param("q", word)).andReturn();
        assertThat((List<String>) read(all, "$.facets.specs[*].label")).containsExactly("RAM", "Screen size");
        assertThat((List<String>) read(all, "$.facets.specs[?(@.key=='ram')].values[*].value")).containsExactly("8 GB", "16 GB");
        assertThat((List<Integer>) read(all, "$.facets.specs[?(@.key=='ram')].values[*].count")).containsExactly(2, 1);
        // Non-filterable specs never become filters.
        assertThat((List<String>) read(all, "$.facets.specs[*].key")).doesNotContain("weight");

        // RAM = 8 GB: Alpha and Charlie. The RAM facet still offers 16 GB (disjunctive); screens narrow down.
        MvcResult ram8 = mvc.perform(get("/api/v1/products").param("q", word).param("spec.ram", "8 GB"))
                .andExpect(jsonPath("$.totalItems").value(2)).andReturn();
        assertThat((List<String>) read(ram8, "$.facets.specs[?(@.key=='ram')].values[*].value")).containsExactly("8 GB", "16 GB");
        assertThat((List<Integer>) read(ram8, "$.facets.specs[?(@.key=='screen_size')].values[*].count")).containsExactly(1, 1);

        // Different specs combine with AND; values of one spec with OR.
        mvc.perform(get("/api/v1/products").param("q", word).param("spec.ram", "8 GB").param("spec.screen_size", "6.4″"))
                .andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].slug").value(a.slug()));
        mvc.perform(get("/api/v1/products").param("q", word).param("spec.ram", "8 GB").param("spec.ram", "16 GB"))
                .andExpect(jsonPath("$.totalItems").value(3));

        // Filters can't be abused through the key.
        mvc.perform(get("/api/v1/products").param("spec.ram\" OR 1=1", "x")).andExpect(status().isBadRequest());
    }

    @Test
    void runningDealDiscountsProductSearchAndCart() throws Exception {
        Session admin = admin();
        String word = randomWord();
        var product = createProduct(admin, word + " Deal", 10000, 5, "128 GB");
        String variant = product.variantIds().getFirst();

        Instant now = Instant.now();
        putDeal(admin, product.id(), 20, now.minusSeconds(3600), now.plus(Duration.ofDays(1)));

        mvc.perform(get("/api/v1/products/{slug}", product.slug()))
                .andExpect(jsonPath("$.price.cents").value(8000))
                .andExpect(jsonPath("$.compareAtPrice.cents").value(10000))
                .andExpect(jsonPath("$.variants[0].price.cents").value(8000))
                .andExpect(jsonPath("$.variants[0].compareAtPrice.cents").value(10000))
                .andExpect(jsonPath("$.deal.percentOff").value(20));
        mvc.perform(get("/api/v1/admin/products/{id}", product.id()).header("Authorization", admin.bearer()))
                .andExpect(jsonPath("$.variants[0].price.cents").value(10000)) // admins edit the regular price
                .andExpect(jsonPath("$.deal.percentOff").value(20));

        // Checkout prices come from the same place: the cart (and so the order) uses the deal price.
        Session customer = register(uniqueEmail());
        mvc.perform(post("/api/v1/cart/items").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"variantId\":\"" + variant + "\",\"quantity\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].unitPrice.cents").value(8000))
                .andExpect(jsonPath("$.subtotal.cents").value(16000));

        await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> mvc.perform(get("/api/v1/products")
                .param("q", word).param("deal", "true"))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].price.cents").value(8000))
                .andExpect(jsonPath("$.items[0].compareAtPrice.cents").value(10000))
                .andExpect(jsonPath("$.items[0].dealEndsAt").exists()));
        mvc.perform(get("/api/v1/products").param("sort", "deal_ending")).andExpect(status().isOk());

        // Removing the deal restores the regular price everywhere.
        mvc.perform(delete("/api/v1/admin/products/{id}/deal", product.id()).header("Authorization", admin.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.deal").value(nullValue()));
        mvc.perform(get("/api/v1/products/{slug}", product.slug()))
                .andExpect(jsonPath("$.price.cents").value(10000)).andExpect(jsonPath("$.deal").value(nullValue()));
        mvc.perform(get("/api/v1/cart").header("Authorization", customer.bearer()))
                .andExpect(jsonPath("$.items[0].unitPrice.cents").value(10000));
        await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> mvc.perform(get("/api/v1/products")
                .param("q", word).param("deal", "true")).andExpect(jsonPath("$.totalItems").value(0)));
    }

    @Test
    void dealInputIsValidated() throws Exception {
        Session admin = admin();
        var product = createProduct(admin, unique("Tablet"), 30000, 1, "64 GB");
        Instant now = Instant.now();
        String url = "/api/v1/admin/products/" + product.id() + "/deal";

        mvc.perform(put(url).header("Authorization", admin.bearer()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"percentOff\":95,\"startsAt\":\"%s\",\"endsAt\":\"%s\"}".formatted(now, now.plusSeconds(60))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.percentOff").exists());
        mvc.perform(put(url).header("Authorization", admin.bearer()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"percentOff\":10,\"startsAt\":\"%s\",\"endsAt\":\"%s\"}".formatted(now.plusSeconds(120), now.plusSeconds(60))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.endsAt").exists());
        mvc.perform(put(url).header("Authorization", admin.bearer()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"percentOff\":10,\"startsAt\":\"%s\",\"endsAt\":\"%s\"}".formatted(now.minusSeconds(7200), now.minusSeconds(3600))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.endsAt").exists());
    }

    @Test
    void scheduledDealStartsOnTimeAndTheBoundaryJobRefreshesSearch() throws Exception {
        Session admin = admin();
        String word = randomWord();
        var product = createProduct(admin, word + " Scheduled", 20000, 3, "256 GB");

        Instant start = Instant.now().plusSeconds(3);
        putDeal(admin, product.id(), 25, start, start.plus(Duration.ofHours(1)));

        // Scheduled, not running: shoppers pay the regular price; admins see the schedule.
        mvc.perform(get("/api/v1/products/{slug}", product.slug()))
                .andExpect(jsonPath("$.price.cents").value(20000)).andExpect(jsonPath("$.deal").value(nullValue()));
        mvc.perform(get("/api/v1/admin/products/{id}", product.id()).header("Authorization", admin.bearer()))
                .andExpect(jsonPath("$.deal.percentOff").value(25));
        await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> mvc.perform(get("/api/v1/products").param("q", word))
                .andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].price.cents").value(20000)));

        // The deal starts; nobody edits the product, so only the boundary job can fix the index.
        await().atMost(Duration.ofSeconds(10)).until(() -> Instant.now().isAfter(start.plusMillis(200)));
        mvc.perform(get("/api/v1/products/{slug}", product.slug()))
                .andExpect(jsonPath("$.price.cents").value(15000)).andExpect(jsonPath("$.deal.percentOff").value(25));
        assertThat(dealJob.publishBoundariesBetween(Instant.now().minusSeconds(60), Instant.now()))
                .contains(java.util.UUID.fromString(product.id()));
        await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> mvc.perform(get("/api/v1/products").param("q", word))
                .andExpect(jsonPath("$.items[0].price.cents").value(15000))
                .andExpect(jsonPath("$.items[0].compareAtPrice.cents").value(20000)));
    }
}
