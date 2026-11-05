package com.za.shop;

import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;

class ShopSettingsTests extends IntegrationTest {

    @AfterEach
    void restoreDefaults() throws Exception {
        mvc.perform(put("/api/v1/admin/shop").header("Authorization", admin().bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Z&A\",\"tagline\":null,\"theme\":\"footwear\",\"accentColor\":null}"));
    }

    @Test
    void adminSwitchesTheDesignAndEveryoneSeesIt() throws Exception {
        mvc.perform(get("/api/v1/shop"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("max-age=30")))
                .andExpect(jsonPath("$.theme").value("footwear"))
                .andExpect(jsonPath("$.currency").value("EUR"));

        Session admin = admin();
        mvc.perform(put("/api/v1/admin/shop").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"Corner Grocer","tagline":"Fresh food, delivered today","theme":"GROCERY",
                         "accentColor":"#1F8A4C"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.theme").value("grocery"))
                .andExpect(jsonPath("$.accentColor").value("#1f8a4c"));

        mvc.perform(get("/api/v1/shop"))
                .andExpect(jsonPath("$.name").value("Corner Grocer"))
                .andExpect(jsonPath("$.tagline").value("Fresh food, delivered today"))
                .andExpect(jsonPath("$.theme").value("grocery"));
    }

    @Test
    void rejectsUnknownDesignsBadColoursAndNonAdmins() throws Exception {
        Session admin = admin();
        mvc.perform(put("/api/v1/admin/shop").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"X\",\"theme\":\"spaceship\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.theme").exists());
        mvc.perform(put("/api/v1/admin/shop").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"X\",\"theme\":\"home\",\"accentColor\":\"red\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.accentColor").exists());
        mvc.perform(put("/api/v1/admin/shop").header("Authorization", register(uniqueEmail()).bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"X\",\"theme\":\"home\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void logoKeepsTransparencyAndCanBeRemoved() throws Exception {
        Session admin = admin();
        BufferedImage transparent = new BufferedImage(1024, 256, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(transparent, "png", png);

        MvcResult uploaded = mvc.perform(multipart("/api/v1/admin/shop/logo")
                .file(new MockMultipartFile("file", "logo.png", "image/png", png.toByteArray()))
                .header("Authorization", admin.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.logoUrl").value(endsWith(".png")))
                .andReturn();
        String url = read(uploaded, "$.logoUrl");
        byte[] stored = mvc.perform(get(url.replace("http://localhost", ""))).andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsByteArray();
        BufferedImage logo = ImageIO.read(new ByteArrayInputStream(stored));
        assertThat(logo.getWidth()).isEqualTo(512);
        assertThat(logo.getColorModel().hasAlpha()).isTrue();

        mvc.perform(delete("/api/v1/admin/shop/logo").header("Authorization", admin.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.logoUrl").value(nullValue()));
    }
}
