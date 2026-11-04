package com.za.shop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class CheckoutFlowTests extends IntegrationTest {

    static final String ADDRESS = """
            {"shippingAddress":{"fullName":"Test Customer","line1":"Hauptstraße 1","postalCode":"10115",
             "city":"Berlin","country":"DE"}}""";

    @Test
    void guestCartMergesOnLoginThenCheckoutPaysAndCommitsStock() throws Exception {
        Session admin = admin();
        CreatedProduct product = createProduct(admin, unique("Court"), 2500, 4, "42");
        String variant = product.variantIds().getFirst();

        // Guest cart: the first add creates the cart id.
        MvcResult first = mvc.perform(post("/api/v1/cart/items").contentType(MediaType.APPLICATION_JSON)
                .content(item(variant, 1))).andExpect(status().isOk()).andExpect(header().exists("X-Cart-Id")).andReturn();
        String cartId = first.getResponse().getHeader("X-Cart-Id");
        mvc.perform(post("/api/v1/cart/items").header("X-Cart-Id", cartId).contentType(MediaType.APPLICATION_JSON)
                .content(item(variant, 1)))
                .andExpect(jsonPath("$.itemCount").value(2))
                .andExpect(jsonPath("$.subtotal.cents").value(5000))
                .andExpect(jsonPath("$.shipping.cents").value(0)); // free from €50
        mvc.perform(post("/api/v1/cart/items").header("X-Cart-Id", cartId).contentType(MediaType.APPLICATION_JSON)
                .content(item(variant, 10)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"))
                .andExpect(jsonPath("$.items[0].available").value(4));

        // Logging in merges the guest cart into the customer's cart.
        String email = uniqueEmail();
        Session customer = register(email);
        mvc.perform(get("/api/v1/cart").header("Authorization", customer.bearer()).header("X-Cart-Id", cartId))
                .andExpect(jsonPath("$.id").value(nullValue()))
                .andExpect(jsonPath("$.itemCount").value(2));
        mvc.perform(get("/api/v1/cart").header("X-Cart-Id", cartId)).andExpect(jsonPath("$.itemCount").value(0));

        // Checkout reserves stock.
        MvcResult checkout = mvc.perform(post("/api/v1/checkout").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(ADDRESS))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderNumber").value(containsString("ZA-")))
                .andExpect(jsonPath("$.paymentUrl").value(containsString("/checkout/pay/")))
                .andReturn();
        String orderId = read(checkout, "$.orderId");
        String paymentUrl = read(checkout, "$.paymentUrl");
        assertThat(available(product.slug(), variant)).isEqualTo(2);
        mvc.perform(get("/api/v1/orders/{id}", orderId).header("Authorization", customer.bearer()))
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.total.cents").value(5000))
                .andExpect(jsonPath("$.lines[0].quantity").value(2))
                .andExpect(jsonPath("$.shippingAddress.city").value("Berlin"));

        // Somebody else can neither see the order nor pay it.
        Session stranger = register(uniqueEmail());
        mvc.perform(get("/api/v1/orders/{id}", orderId).header("Authorization", stranger.bearer()))
                .andExpect(status().isNotFound());
        String sessionId = paymentUrl.substring(paymentUrl.indexOf("/pay/") + 5, paymentUrl.indexOf('?'));
        mvc.perform(post("/api/v1/payments/fake/sessions/{id}/complete", sessionId)
                .header("Authorization", stranger.bearer())).andExpect(status().isNotFound());

        // Paying turns the order PAID (asynchronously), commits stock and empties the cart.
        mvc.perform(post("/api/v1/payments/fake/sessions/{id}/complete", sessionId)
                .header("Authorization", customer.bearer())).andExpect(status().isNoContent());
        await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> mvc.perform(get("/api/v1/orders/{id}", orderId)
                .header("Authorization", customer.bearer())).andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.paymentUrl").value(nullValue())));
        assertThat(available(product.slug(), variant)).isEqualTo(2);
        mvc.perform(get("/api/v1/admin/products/{id}", product.id()).header("Authorization", admin.bearer()))
                .andExpect(jsonPath("$.variants[0].onHand").value(2))
                .andExpect(jsonPath("$.variants[0].reserved").value(0));
        await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                mvc.perform(get("/api/v1/cart").header("Authorization", customer.bearer()))
                        .andExpect(jsonPath("$.itemCount").value(0)));
        await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
                assertThat(mail.subjectsTo(email)).anyMatch(s -> s.contains("confirmed")));

        // Fulfilment state machine.
        changeStatus(admin, orderId, "DELIVERED").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_STATE_TRANSITION"));
        changeStatus(admin, orderId, "SHIPPED").andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SHIPPED"));
        changeStatus(admin, orderId, "DELIVERED").andExpect(jsonPath("$.status").value("DELIVERED"));
        changeStatus(admin, orderId, "CANCELLED").andExpect(status().isConflict());

        mvc.perform(get("/api/v1/orders").header("Authorization", customer.bearer()))
                .andExpect(jsonPath("$.items[0].id").value(orderId))
                .andExpect(jsonPath("$.items[0].itemCount").value(2));
        mvc.perform(get("/api/v1/admin/orders").param("q", email).header("Authorization", admin.bearer()))
                .andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/admin/dashboard").header("Authorization", admin.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revenue.today.currency").value("EUR"));
    }

    @Test
    void cancellingPaymentReleasesStock() throws Exception {
        Session admin = admin();
        CreatedProduct product = createProduct(admin, unique("Clog"), 3000, 1, "40");
        String variant = product.variantIds().getFirst();
        Session customer = register(uniqueEmail());
        mvc.perform(post("/api/v1/cart/items").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(item(variant, 1))).andExpect(status().isOk());
        MvcResult checkout = mvc.perform(post("/api/v1/checkout").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(ADDRESS)).andExpect(status().isCreated()).andReturn();
        String orderId = read(checkout, "$.orderId");
        String paymentUrl = read(checkout, "$.paymentUrl");
        assertThat(available(product.slug(), variant)).isZero();

        // The last unit is reserved: a second customer cannot buy it.
        Session other = register(uniqueEmail());
        mvc.perform(post("/api/v1/cart/items").header("Authorization", other.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(item(variant, 1)))
                .andExpect(status().isConflict());

        String sessionId = paymentUrl.substring(paymentUrl.indexOf("/pay/") + 5, paymentUrl.indexOf('?'));
        mvc.perform(post("/api/v1/payments/fake/sessions/{id}/cancel", sessionId)
                .header("Authorization", customer.bearer())).andExpect(status().isNoContent());
        await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> mvc.perform(get("/api/v1/orders/{id}", orderId)
                .header("Authorization", customer.bearer())).andExpect(jsonPath("$.status").value("CANCELLED")));
        assertThat(available(product.slug(), variant)).isEqualTo(1);
        mvc.perform(post("/api/v1/payments/fake/sessions/{id}/complete", sessionId)
                .header("Authorization", customer.bearer())).andExpect(status().isConflict());
    }

    @Test
    void emptyCartCannotBeCheckedOut() throws Exception {
        Session customer = register(uniqueEmail());
        mvc.perform(post("/api/v1/checkout").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(ADDRESS))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("EMPTY_CART"));
        mvc.perform(post("/api/v1/checkout").contentType(MediaType.APPLICATION_JSON).content(ADDRESS))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/checkout").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"shippingAddress\":{\"country\":\"Germany\"}}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    private org.springframework.test.web.servlet.ResultActions changeStatus(Session admin, String orderId,
            String status) throws Exception {
        return mvc.perform(post("/api/v1/admin/orders/{id}/status", orderId).header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"" + status + "\"}"));
    }

    static String item(String variantId, int quantity) {
        return "{\"variantId\":\"" + variantId + "\",\"quantity\":" + quantity + "}";
    }
}
