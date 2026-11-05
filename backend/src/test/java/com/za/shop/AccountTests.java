package com.za.shop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.ResultActions;

import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;

class AccountTests extends IntegrationTest {

    @Autowired
    JdbcClient jdbc;

    // ───────────── helpers ─────────────

    private ResultActions forgot(String email) throws Exception {
        return mvc.perform(post("/api/v1/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\"}"));
    }

    private ResultActions reset(String token, String password) throws Exception {
        return mvc.perform(post("/api/v1/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"password\":\"" + password + "\"}"));
    }

    private long resetMails(String email) {
        return mail.subjectsTo(email).stream().filter(s -> s.contains("Reset your password")).count();
    }

    /** The token in the most recent reset email sent to the address. */
    private String resetToken(String email) throws Exception {
        MimeMessage latest = null;
        for (MimeMessage message : mail.sent()) {
            if (message.getAllRecipients()[0].toString().equals(email) && message.getSubject().contains("Reset your password")) {
                latest = message;
            }
        }
        assertThat(latest).as("a reset email to %s", email).isNotNull();
        Object content = latest.getContent();
        String html = content instanceof MimeMultipart multipart ? text(multipart) : content.toString();
        Matcher matcher = Pattern.compile("reset-password\\?token=([A-Za-z0-9_-]+)").matcher(html);
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private static String text(MimeMultipart multipart) throws Exception {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < multipart.getCount(); i++) {
            Object part = multipart.getBodyPart(i).getContent();
            out.append(part instanceof MimeMultipart nested ? text(nested) : part.toString());
        }
        return out.toString();
    }

    private static String address(String name, String label, boolean isDefault) {
        return """
                {"label":%s,"fullName":"%s","line1":"Hauptstraße 1","postalCode":"10115","city":"Berlin","country":"DE",
                 "isDefault":%s}""".formatted(label == null ? "null" : "\"" + label + "\"", name, isDefault);
    }

    private ResultActions addAddress(Session s, String body) throws Exception {
        return mvc.perform(post("/api/v1/me/addresses").header("Authorization", s.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    // ───────────── password reset ─────────────

    @Test
    void passwordResetChangesThePasswordAndEndsAllSessions() throws Exception {
        String email = uniqueEmail();
        Session session = register(email);

        forgot(email).andExpect(status().isNoContent());
        await().atMost(Duration.ofSeconds(20)).until(() -> resetMails(email) == 1);
        String token = resetToken(email);

        // Nothing changes until the link is used.
        login(email, "correct-horse-battery");
        reset(token, "a-brand-new-password").andExpect(status().isNoContent());

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"correct-horse-battery\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        Session again = login(email, "a-brand-new-password");
        mvc.perform(get("/api/v1/me").header("Authorization", again.bearer()))
                .andExpect(jsonPath("$.emailVerified").value(true)); // the link proved the address

        // The link works once, and the session from before the reset is gone.
        reset(token, "yet-another-password").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
        mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + session.refreshToken() + "\"}")).andExpect(status().isUnauthorized());
    }

    @Test
    void forgotPasswordRevealsNothingAndIsRateLimitedPerAccount() throws Exception {
        String known = uniqueEmail();
        register(known);
        String unknown = uniqueEmail();

        forgot(unknown).andExpect(status().isNoContent());
        forgot(known).andExpect(status().isNoContent());
        forgot(known).andExpect(status().isNoContent()); // within the minute: no second email
        forgot(known.toUpperCase()).andExpect(status().isNoContent());

        await().atMost(Duration.ofSeconds(20)).until(() -> resetMails(known) >= 1);
        Thread.sleep(2000);
        assertThat(resetMails(known)).isEqualTo(1);
        assertThat(resetMails(unknown)).isZero();
    }

    @Test
    void resetRejectsBadTokensAndWeakPasswords() throws Exception {
        reset("not-a-real-token", "a-brand-new-password").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
        reset("anything", "short").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    // ───────────── saved addresses ─────────────

    @Test
    void addressBookKeepsExactlyOneDefaultAndIsPrivate() throws Exception {
        Session me = register(uniqueEmail());
        mvc.perform(get("/api/v1/me/addresses").header("Authorization", me.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));

        String first = read(addAddress(me, address("Home", "Home", false)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.isDefault").value(true)).andReturn(), "$.id"); // the first one is the default
        String second = read(addAddress(me, address("Work", "Work", false)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.isDefault").value(false)).andReturn(), "$.id");
        String third = read(addAddress(me, address("Parents", null, true)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.isDefault").value(true)).andReturn(), "$.id");

        mvc.perform(get("/api/v1/me/addresses").header("Authorization", me.bearer()))
                .andExpect(jsonPath("$[*].id").value(contains(third, second, first))) // default first, then newest
                .andExpect(jsonPath("$[?(@.isDefault == true)]", hasSize(1)));

        // Editing one and making it the default moves the flag.
        mvc.perform(put("/api/v1/me/addresses/{id}", first).header("Authorization", me.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(address("Home renamed", "Home", true)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.fullName").value("Home renamed"))
                .andExpect(jsonPath("$.isDefault").value(true));
        mvc.perform(get("/api/v1/me/addresses").header("Authorization", me.bearer()))
                .andExpect(jsonPath("$[?(@.isDefault == true)]", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(first));

        // Deleting the default promotes the newest remaining address.
        mvc.perform(delete("/api/v1/me/addresses/{id}", first).header("Authorization", me.bearer()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/me/addresses").header("Authorization", me.bearer()))
                .andExpect(jsonPath("$", hasSize(2))).andExpect(jsonPath("$[0].id").value(third))
                .andExpect(jsonPath("$[0].isDefault").value(true));

        // Other customers can neither see nor touch them.
        Session other = register(uniqueEmail());
        mvc.perform(get("/api/v1/me/addresses").header("Authorization", other.bearer()))
                .andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(delete("/api/v1/me/addresses/{id}", third).header("Authorization", other.bearer()))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/me/addresses/{id}", third).header("Authorization", other.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(address("Hijack", null, true)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/me/addresses")).andExpect(status().isUnauthorized());
    }

    @Test
    void addressBookHasALimitAndValidatesInput() throws Exception {
        Session me = register(uniqueEmail());
        for (int i = 0; i < 10; i++) {
            addAddress(me, address("Person " + i, null, false)).andExpect(status().isCreated());
        }
        addAddress(me, address("One too many", null, false)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ADDRESS_LIMIT"));
        addAddress(register(uniqueEmail()), """
                {"fullName":"","line1":"x","postalCode":"1","city":"y","country":"germany"}""")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.fullName").exists())
                .andExpect(jsonPath("$.errors.country").exists());
    }

    // ───────────── deleting the account ─────────────

    @Test
    void deletingTheAccountErasesPersonalDataButKeepsOrders() throws Exception {
        Session admin = admin();
        String email = uniqueEmail();
        Session me = register(email);
        addAddress(me, address("Erika", null, true)).andExpect(status().isCreated());
        var product = createProduct(admin, unique("Mug"), 1200, 5, "One size");
        mvc.perform(post("/api/v1/cart/items").header("Authorization", me.bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variantId\":\"" + product.variantIds().getFirst() + "\",\"quantity\":1}"))
                .andExpect(status().isOk());
        String orderId = read(mvc.perform(post("/api/v1/checkout").header("Authorization", me.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(CheckoutFlowTests.ADDRESS))
                .andExpect(status().isCreated()).andReturn(), "$.orderId");

        deleteAccount(me, "wrong-password").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        deleteAccount(admin, ADMIN_PASSWORD).andExpect(status().isForbidden());
        deleteAccount(me, "correct-horse-battery").andExpect(status().isNoContent());

        // Nobody can log in as them any more, not with the old email and not with a fresh one.
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"correct-horse-battery\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + me.refreshToken() + "\"}")).andExpect(status().isUnauthorized());
        // The email address can be used for a new account again.
        register(email);

        var row = jdbc.sql("select email, first_name, last_name, deleted_at from users where id = :id")
                .param("id", UUID.fromString(me.userId())).query((rs, n) -> List.of(rs.getString(1), rs.getString(2),
                        rs.getString(3), String.valueOf(rs.getObject(4)))).single();
        assertThat(row.get(0)).startsWith("deleted-").endsWith("@deleted.invalid").doesNotContain(email);
        assertThat(row.get(1)).isEqualTo("Deleted");
        assertThat(row.get(3)).isNotEqualTo("null");
        assertThat(jdbc.sql("select count(*) from customer_addresses where user_id = :id")
                .param("id", UUID.fromString(me.userId())).query(Long.class).single()).isZero();
        assertThat(jdbc.sql("select count(*) from refresh_tokens where user_id = :id")
                .param("id", UUID.fromString(me.userId())).query(Long.class).single()).isZero();

        // The order stays for the books, with the address it was placed with.
        mvc.perform(get("/api/v1/admin/orders/{id}", orderId).header("Authorization", admin.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.customerEmail").value(email));
        // The cart is erased (asynchronously). The old access token is still valid until it expires, which is
        // why it can still be used to look.
        await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> mvc.perform(get("/api/v1/cart")
                .header("Authorization", me.bearer())).andExpect(jsonPath("$.itemCount").value(0)));
    }

    private ResultActions deleteAccount(Session session, String password) throws Exception {
        return mvc.perform(delete("/api/v1/me").header("Authorization", session.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"" + password + "\"}"));
    }

    // ───────────── content pages ─────────────

    @Test
    void contentPagesStartAsTemplatesAndAreEditedByTheOwner() throws Exception {
        Session admin = admin();
        mvc.perform(get("/api/v1/pages")).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].slug").value(contains("imprint", "terms", "privacy", "returns")))
                .andExpect(jsonPath("$[?(@.slug == 'imprint')].isTemplate").value(contains(true)));
        mvc.perform(get("/api/v1/pages/privacy")).andExpect(status().isOk())
                .andExpect(jsonPath("$.body").value(containsString("za_cart")))
                .andExpect(jsonPath("$.updatedAt").value(nullValue()));

        mvc.perform(put("/api/v1/admin/pages/imprint").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Legal notice\",\"body\":\"## Provider\\nZ&A Test GmbH\\n\\nBerlin\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isTemplate").value(false))
                .andExpect(jsonPath("$.updatedAt").exists());
        mvc.perform(get("/api/v1/pages/imprint"))
                .andExpect(jsonPath("$.title").value("Legal notice"))
                .andExpect(jsonPath("$.body").value(containsString("Z&A Test GmbH")))
                .andExpect(jsonPath("$.isTemplate").value(false));
        mvc.perform(get("/api/v1/pages")).andExpect(jsonPath("$[?(@.slug == 'imprint')].title").value(contains("Legal notice")));

        mvc.perform(put("/api/v1/admin/pages/terms").header("Authorization", register(uniqueEmail()).bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"x\",\"body\":\"y\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/admin/pages/terms").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"\",\"body\":\"y\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.title").exists());
        mvc.perform(get("/api/v1/pages/cookies")).andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/admin/pages/cookies").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"x\",\"body\":\"y\"}"))
                .andExpect(status().isNotFound());
    }
}
