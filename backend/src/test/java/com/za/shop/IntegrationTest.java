package com.za.shop;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.lifecycle.Startables;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.jayway.jsonpath.JsonPath;


/**
 * Boots the whole application against real PostgreSQL, Redis and Meilisearch containers. The
 * containers are started once per JVM and shared by all test classes.
 */
@SpringBootTest(properties = {
        "shop.seed.enabled=false",
        "shop.identity.bootstrap-users[0].email=" + IntegrationTest.ADMIN_EMAIL,
        "shop.identity.bootstrap-users[0].password=" + IntegrationTest.ADMIN_PASSWORD,
        "shop.identity.bootstrap-users[0].admin=true",
        "shop.identity.bootstrap-users[1].email=",
        "shop.media.provider=local",
        "shop.media.public-base-url=http://localhost/media",
        "shop.orders.expiry-check-interval-ms=3600000",
        "shop.identity.refresh-reuse-grace=0s",
        "management.server.port=" })
@AutoConfigureMockMvc
@Import(TestMailConfiguration.class)
public abstract class IntegrationTest {

    static final String ADMIN_EMAIL = "admin@test.local";
    static final String ADMIN_PASSWORD = "admin-password-123";
    static final String MEILI_KEY = "test-master-key-0123456789";

    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    static final GenericContainer<?> MEILISEARCH = new GenericContainer<>(Images.MEILISEARCH)
            .withExposedPorts(7700)
            .withEnv("MEILI_MASTER_KEY", MEILI_KEY)
            .withEnv("MEILI_NO_ANALYTICS", "true")
            .waitingFor(Wait.forHttp("/health").forStatusCode(200).withStartupTimeout(Duration.ofMinutes(2)));

    static {
        Startables.deepStart(POSTGRES, REDIS, MEILISEARCH).join();
    }

    @DynamicPropertySource
    static void containerProperties(DynamicPropertyRegistry registry) throws Exception {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.data.redis.url", () -> "redis://" + REDIS.getHost() + ":" + REDIS.getMappedPort(6379));
        registry.add("shop.search.meilisearch.url",
                () -> "http://" + MEILISEARCH.getHost() + ":" + MEILISEARCH.getMappedPort(7700));
        registry.add("shop.search.meilisearch.api-key", () -> MEILI_KEY);
        Path media = Files.createTempDirectory("shop-media");
        registry.add("shop.media.local.directory", media::toString);
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected TestMailConfiguration.CapturingMailSender mail;

    // ───────────── helpers ─────────────

    protected record Session(String accessToken, String refreshToken, String userId) {
        public String bearer() {
            return "Bearer " + accessToken;
        }
    }

    protected Session register(String email) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"correct-horse-battery","firstName":"Test","lastName":"Customer"}"""
                        .formatted(email)))
                .andExpect(status().isCreated()).andReturn();
        return session(result);
    }

    protected Session login(String email, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"%s"}""".formatted(email, password)))
                .andExpect(status().isOk()).andReturn();
        return session(result);
    }

    protected Session admin() throws Exception {
        return login(ADMIN_EMAIL, ADMIN_PASSWORD);
    }

    protected static String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@test.local";
    }

    protected static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    protected static <T> T read(MvcResult result, String path) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), path);
    }

    /** Creates an active product with one variant per size, each with the given stock. Returns variant ids. */
    protected CreatedProduct createProduct(Session admin, String name, long priceCents, int stock, String... sizes)
            throws Exception {
        String brandId = read(mvc.perform(post("/api/v1/admin/brands").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"%s"}""".formatted(unique("Brand"))))
                .andExpect(status().isCreated()).andReturn(), "$.id");
        MvcResult created = mvc.perform(post("/api/v1/admin/products").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"%s","description":"Test shoe","brandId":"%s","categoryIds":[],"status":"ACTIVE"}"""
                        .formatted(name, brandId)))
                .andExpect(status().isCreated()).andReturn();
        String productId = read(created, "$.id");
        String slug = read(created, "$.slug");
        List<String> variantIds = new java.util.ArrayList<>();
        for (String size : sizes) {
            MvcResult withVariant = mvc.perform(post("/api/v1/admin/products/{id}/variants", productId)
                    .header("Authorization", admin.bearer()).contentType(MediaType.APPLICATION_JSON).content("""
                            {"sku":"%s","size":"%s","color":"Black","priceCents":%d,"onHand":%d}"""
                            .formatted(unique("SKU"), size, priceCents, stock)))
                    .andExpect(status().isCreated()).andReturn();
            List<String> ids = read(withVariant, "$.variants[*].id");
            variantIds.add(ids.getLast());
        }
        return new CreatedProduct(productId, slug, brandId, variantIds);
    }

    protected record CreatedProduct(String id, String slug, String brandId, List<String> variantIds) {
    }

    protected void setStock(Session admin, String variantId, int onHand) throws Exception {
        mvc.perform(put("/api/v1/admin/inventory/{id}", variantId).header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"onHand\":" + onHand + "}"))
                .andExpect(status().isOk());
    }

    protected int available(String slug, String variantId) throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/products/{slug}", slug)).andExpect(status().isOk()).andReturn();
        List<Integer> values = read(result, "$.variants[?(@.id == '" + variantId + "')].available");
        return values.getFirst();
    }

    private static Session session(MvcResult result) throws Exception {
        return new Session(read(result, "$.accessToken"), read(result, "$.refreshToken"), read(result, "$.user.id"));
    }

    // ───────────── test infrastructure ─────────────

    static final class Images {
        static final String MEILISEARCH = "getmeili/meilisearch:v1.56.1";
    }
}
