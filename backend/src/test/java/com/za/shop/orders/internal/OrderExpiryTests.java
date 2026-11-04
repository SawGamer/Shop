package com.za.shop.orders.internal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;

import com.za.shop.IntegrationTest;

/** Unpaid orders give their stock back once the payment window closes. */
class OrderExpiryTests extends IntegrationTest {

    @Autowired
    OrderLifecycle lifecycle;

    @Autowired
    JdbcClient jdbc;

    @Test
    void overdueUnpaidOrdersAreCancelledAndReleaseStock() throws Exception {
        var product = createProduct(admin(), unique("Expiring"), 4200, 1, "41");
        String variant = product.variantIds().getFirst();
        var customer = register(uniqueEmail());
        mvc.perform(post("/api/v1/cart/items").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variantId\":\"" + variant + "\",\"quantity\":1}")).andExpect(status().isOk());
        String orderId = read(mvc.perform(post("/api/v1/checkout").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"shippingAddress":{"fullName":"A","line1":"B 1","postalCode":"1010","city":"Wien","country":"AT"}}"""))
                .andExpect(status().isCreated()).andReturn(), "$.orderId");
        assertThat(available(product.slug(), variant)).isZero();

        lifecycle.expireOverdueOrders(); // not overdue yet
        mvc.perform(get("/api/v1/orders/{id}", orderId).header("Authorization", customer.bearer()))
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"));

        jdbc.sql("update orders set expires_at = now() - interval '1 hour' where id = :id")
                .param("id", UUID.fromString(orderId)).update();
        lifecycle.expireOverdueOrders();

        mvc.perform(get("/api/v1/orders/{id}", orderId).header("Authorization", customer.bearer()))
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelledAt").exists());
        assertThat(available(product.slug(), variant)).isEqualTo(1);
    }
}
