package com.za.shop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.endsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

class CatalogAndSearchTests extends IntegrationTest {

    @Test
    void publishedProductsAreVisibleWithSortedOptionsAndCheapestPrice() throws Exception {
        Session admin = admin();
        CreatedProduct product = createProduct(admin, unique("Runner"), 9990, 3, "44", "38", "42.5");

        mvc.perform(get("/api/v1/products/{slug}", product.slug()))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("max-age")))
                .andExpect(jsonPath("$.sizes").value(contains("38", "42.5", "44")))
                .andExpect(jsonPath("$.price.cents").value(9990))
                .andExpect(jsonPath("$.price.currency").value("EUR"))
                .andExpect(jsonPath("$.inStock").value(true))
                .andExpect(jsonPath("$.variants.length()").value(3));

        // Drafts are hidden from the public API.
        mvc.perform(put("/api/v1/admin/products/{id}", product.id()).header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"Hidden shoe","brandId":"%s","categoryIds":[],"status":"DRAFT"}"""
                        .formatted(product.brandId())))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/products/hidden-shoe")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void categoryTreeAndValidation() throws Exception {
        Session admin = admin();
        String parentSlug = unique("shoes");
        String parent = read(mvc.perform(post("/api/v1/admin/categories").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Shoes\",\"slug\":\"" + parentSlug + "\"}"))
                .andExpect(status().isCreated()).andReturn(), "$.id");
        mvc.perform(post("/api/v1/admin/categories").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Trail\",\"slug\":\"" + parentSlug + "-trail\",\"parentId\":\"" + parent + "\"}"))
                .andExpect(status().isCreated());

        MvcResult tree = mvc.perform(get("/api/v1/categories")).andExpect(status().isOk()).andReturn();
        List<String> children = read(tree, "$[?(@.slug == '" + parentSlug + "')].children[*].slug");
        assertThat(children).containsExactly(parentSlug + "-trail");

        mvc.perform(post("/api/v1/admin/categories").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"X\",\"slug\":\"Not Valid!\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.slug").exists());
        mvc.perform(post("/api/v1/admin/categories").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Dup\",\"slug\":\"" + parentSlug + "\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void duplicateSkusAreRejected() throws Exception {
        Session admin = admin();
        CreatedProduct product = createProduct(admin, unique("Boot"), 5000, 1, "40");
        String sku = unique("DUP");
        String body = "{\"sku\":\"" + sku + "\",\"size\":\"41\",\"priceCents\":5000,\"onHand\":1}";
        mvc.perform(post("/api/v1/admin/products/{id}/variants", product.id()).header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/admin/products/{id}/variants", product.id()).header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    void imagesAreValidatedResizedAndServed() throws Exception {
        Session admin = admin();
        CreatedProduct product = createProduct(admin, unique("Sandal"), 4000, 2, "39");

        MvcResult uploaded = mvc.perform(multipart("/api/v1/admin/products/{id}/images", product.id())
                .file(new MockMultipartFile("file", "photo.png", "image/png", png(2400, 1200)))
                .param("alt", "Side view").header("Authorization", admin.bearer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.images[0].url").value(endsWith(".jpg")))
                .andExpect(jsonPath("$.images[0].alt").value("Side view"))
                .andReturn();
        String url = read(uploaded, "$.images[0].url");
        MvcResult file = mvc.perform(get(url.replace("http://localhost", ""))).andExpect(status().isOk()).andReturn();
        BufferedImage stored = ImageIO.read(new java.io.ByteArrayInputStream(file.getResponse().getContentAsByteArray()));
        assertThat(stored.getWidth()).isEqualTo(1600);
        assertThat(stored.getHeight()).isEqualTo(800);

        mvc.perform(multipart("/api/v1/admin/products/{id}/images", product.id())
                .file(new MockMultipartFile("file", "evil.png", "image/png", "<?php echo 1; ?>".getBytes()))
                .header("Authorization", admin.bearer()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void searchFiltersSortsAndReturnsDisjunctiveFacets() throws Exception {
        Session admin = admin();
        String word = "zq" + new java.util.Random().ints(10, 'a', 'z' + 1)
                .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append);
        CreatedProduct a1 = createProduct(admin, word + " Alpha One", 12000, 5, "41", "42");
        CreatedProduct a2 = createProduct(admin, word + " Alpha Two", 8000, 0, "42");
        CreatedProduct b1 = createProduct(admin, word + " Beta", 10000, 2, "43");
        String brandA = slugOfBrand(a1);
        // Put a2 under the same brand as a1.
        mvc.perform(put("/api/v1/admin/products/{id}", a2.id()).header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"%s Alpha Two","brandId":"%s","categoryIds":[],"status":"ACTIVE"}"""
                        .formatted(word, a1.brandId())))
                .andExpect(status().isOk());

        await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> mvc.perform(get("/api/v1/products").param("q", word))
                .andExpect(jsonPath("$.totalItems").value(3)));

        // Brand filter: brand facet still lists the other brand (disjunctive), sizes reflect the filter.
        MvcResult filtered = mvc.perform(get("/api/v1/products").param("q", word).param("brand", brandA)
                .param("sort", "price_asc")).andExpect(status().isOk()).andReturn();
        assertThat((List<String>) read(filtered, "$.items[*].slug")).containsExactly(a2.slug(), a1.slug());
        List<Map<String, Object>> brandFacet = read(filtered, "$.facets.brand");
        assertThat(brandFacet).hasSize(2);
        assertThat((List<String>) read(filtered, "$.facets.size[*].value")).containsExactly("41", "42");

        mvc.perform(get("/api/v1/products").param("q", word).param("inStock", "true"))
                .andExpect(jsonPath("$.totalItems").value(2));
        mvc.perform(get("/api/v1/products").param("q", word).param("minPrice", "9000").param("maxPrice", "11000"))
                .andExpect(jsonPath("$.items[0].slug").value(b1.slug()))
                .andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/products").param("q", word).param("size", "43"))
                .andExpect(jsonPath("$.items[0].brand.slug").value(slugOfBrand(b1)));
        mvc.perform(get("/api/v1/products").param("sort", "cheapest"))
                .andExpect(status().isBadRequest());

        // Archiving removes the product from search.
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .delete("/api/v1/admin/products/{id}", b1.id()).header("Authorization", admin.bearer()))
                .andExpect(status().isNoContent());
        await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> mvc.perform(get("/api/v1/products").param("q", word))
                .andExpect(jsonPath("$.totalItems").value(2)));
    }

    private String slugOfBrand(CreatedProduct product) throws Exception {
        return read(mvc.perform(get("/api/v1/products/{slug}", product.slug())).andReturn(), "$.brand.slug");
    }

    private static byte[] png(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}
