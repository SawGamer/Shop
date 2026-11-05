package com.za.shop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;

class AuthFlowTests extends IntegrationTest {

    @Test
    void registerLoginAndVerifyEmail() throws Exception {
        String email = uniqueEmail();
        Session session = register(email);

        mvc.perform(get("/api/v1/me").header("Authorization", session.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.roles").value(contains("CUSTOMER")))
                .andExpect(jsonPath("$.emailVerified").value(false));

        String token = await().atMost(Duration.ofSeconds(20)).until(() -> verificationToken(email), t -> t != null);
        mvc.perform(post("/api/v1/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}")).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_TOKEN"));

        Session again = login(email.toUpperCase(), "correct-horse-battery");
        mvc.perform(get("/api/v1/me").header("Authorization", again.bearer()))
                .andExpect(jsonPath("$.emailVerified").value(true));
    }

    @Test
    void registrationCannotGrantRolesOrOverwriteAccounts() throws Exception {
        Session admin = admin();
        String email = uniqueEmail();
        // The old app bound the form straight onto the User entity; extra fields must be ignored now.
        String body = """
                {"email":"%s","password":"correct-horse-battery","firstName":"Eve","lastName":"X",
                 "id":"%s","roles":["ADMIN"],"emailVerified":true}""".formatted(email, admin.userId());
        String userId = read(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isCreated()).andReturn(), "$.user.id");

        assertThat(userId).isNotEqualTo(admin.userId());
        Session eve = login(email, "correct-horse-battery");
        mvc.perform(get("/api/v1/me").header("Authorization", eve.bearer()))
                .andExpect(jsonPath("$.roles").value(contains("CUSTOMER")))
                .andExpect(jsonPath("$.emailVerified").value(false));
        mvc.perform(get("/api/v1/admin/dashboard").header("Authorization", eve.bearer()))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        login(ADMIN_EMAIL, ADMIN_PASSWORD); // admin account untouched
    }

    @Test
    void rejectsDuplicatesBadInputAndWrongPasswords() throws Exception {
        String email = uniqueEmail();
        register(email);
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"correct-horse-battery","firstName":"A","lastName":"B"}""".formatted(email)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"not-an-email","password":"short","firstName":"","lastName":"B"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists())
                .andExpect(jsonPath("$.errors.firstName").exists());
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"wrong-password"}""".formatted(email)))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        mvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer not.a.jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshTokensRotateAndReuseRevokesTheSession() throws Exception {
        String email = uniqueEmail();
        Session first = register(email);

        String second = read(refresh(first.refreshToken()).andExpect(status().isOk()).andReturn(), "$.refreshToken");
        assertThat(second).isNotEqualTo(first.refreshToken());

        // Replaying the rotated token looks like theft: it fails and kills the whole session.
        refresh(first.refreshToken()).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
        refresh(second).andExpect(status().isUnauthorized());

        // A fresh login works and logout revokes it.
        Session fresh = login(email, "correct-horse-battery");
        mvc.perform(post("/api/v1/auth/logout").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + fresh.refreshToken() + "\"}")).andExpect(status().isNoContent());
        refresh(fresh.refreshToken()).andExpect(status().isUnauthorized());
    }

    private org.springframework.test.web.servlet.ResultActions refresh(String refreshToken) throws Exception {
        return mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refreshToken + "\"}"));
    }

    private String verificationToken(String email) {
        for (MimeMessage message : mail.sent()) {
            try {
                if (!message.getAllRecipients()[0].toString().equals(email)) {
                    continue;
                }
                Object content = message.getContent();
                String html = content instanceof MimeMultipart multipart ? bodyOf(multipart) : content.toString();
                Matcher matcher = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(html);
                if (matcher.find()) {
                    return matcher.group(1);
                }
            }
            catch (Exception e) {
                throw new IllegalStateException(e);
            }
        }
        return null;
    }

    private static String bodyOf(MimeMultipart multipart) throws Exception {
        StringBuilder text = new StringBuilder();
        for (int i = 0; i < multipart.getCount(); i++) {
            Object part = multipart.getBodyPart(i).getContent();
            text.append(part instanceof MimeMultipart nested ? bodyOf(nested) : part.toString());
        }
        return text.toString();
    }
}
