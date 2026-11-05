package com.za.shop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import com.stripe.Stripe;
import com.za.shop.payments.internal.StripeCheckoutApi;

/** Checkout with the Stripe provider; the Stripe API is stubbed, webhooks are signed like Stripe does. */
@TestPropertySource(properties = {
        "shop.payments.provider=stripe",
        "shop.payments.stripe.secret-key=sk_test_dummy",
        "shop.payments.stripe.webhook-secret=" + StripePaymentTests.WEBHOOK_SECRET })
class StripePaymentTests extends IntegrationTest {

    static final String WEBHOOK_SECRET = "whsec_test_secret";

    @MockitoBean
    StripeCheckoutApi stripe;

    private String stripeSessionId;

    @BeforeEach
    void stubStripe() throws Exception {
        stripeSessionId = "cs_test_" + UUID.randomUUID().toString().replace("-", "");
        when(stripe.create(any(), anyString())).thenReturn(new StripeCheckoutApi.CreatedSession(stripeSessionId,
                "https://checkout.stripe.com/c/pay/" + stripeSessionId));
    }

    @Test
    void signedWebhookMarksTheOrderPaidOnce() throws Exception {
        Session customer = customerWithItemInCart(1999, 2);
        MvcResult checkout = mvc.perform(post("/api/v1/checkout").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(CheckoutFlowTests.ADDRESS))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.paymentUrl").value("https://checkout.stripe.com/c/pay/" + stripeSessionId))
                .andReturn();
        String orderId = read(checkout, "$.orderId");
        int total = read(mvc.perform(get("/api/v1/orders/{id}", orderId).header("Authorization", customer.bearer()))
                .andReturn(), "$.total.cents");
        assertThat(total).isEqualTo(2 * 1999 + 495);

        String event = completedEvent("evt_" + UUID.randomUUID(), stripeSessionId, total, "eur");
        webhook(event, sign(event, WEBHOOK_SECRET)).andExpect(status().isOk());
        webhook(event, sign(event, WEBHOOK_SECRET)).andExpect(status().isOk()); // duplicate delivery

        await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> mvc.perform(get("/api/v1/orders/{id}", orderId)
                .header("Authorization", customer.bearer())).andExpect(jsonPath("$.status").value("PAID")));
    }

    @Test
    void rejectsForgedWebhooksAndWrongAmounts() throws Exception {
        Session customer = customerWithItemInCart(5000, 1);
        String orderId = read(mvc.perform(post("/api/v1/checkout").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(CheckoutFlowTests.ADDRESS))
                .andExpect(status().isCreated()).andReturn(), "$.orderId");

        String underpaid = completedEvent("evt_" + UUID.randomUUID(), stripeSessionId, 1, "eur");
        webhook(underpaid, sign(underpaid, "whsec_attacker")).andExpect(status().isBadRequest());
        webhook(underpaid, "t=1,v1=deadbeef").andExpect(status().isBadRequest());
        webhook(underpaid, sign(underpaid, WEBHOOK_SECRET)).andExpect(status().isOk()); // genuine, but wrong amount

        Thread.sleep(1500);
        mvc.perform(get("/api/v1/orders/{id}", orderId).header("Authorization", customer.bearer()))
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"));
    }

    private Session customerWithItemInCart(long priceCents, int quantity) throws Exception {
        CreatedProduct product = createProduct(admin(), unique("Stripe shoe"), priceCents, 10, "42");
        Session customer = register(uniqueEmail());
        mvc.perform(post("/api/v1/cart/items").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(CheckoutFlowTests.item(product.variantIds().getFirst(), quantity)))
                .andExpect(status().isOk());
        return customer;
    }

    private org.springframework.test.web.servlet.ResultActions webhook(String payload, String signature)
            throws Exception {
        return mvc.perform(post("/api/v1/payments/stripe/webhook").header("Stripe-Signature", signature)
                .contentType(MediaType.APPLICATION_JSON).content(payload));
    }

    private static String completedEvent(String eventId, String sessionId, long amount, String currency) {
        return """
                {"id":"%s","object":"event","api_version":"%s","created":%d,"type":"checkout.session.completed",
                 "data":{"object":{"id":"%s","object":"checkout.session","amount_total":%d,"currency":"%s",
                 "payment_status":"paid","status":"complete","metadata":{}}}}"""
                .formatted(eventId, Stripe.API_VERSION, Instant.now().getEpochSecond(), sessionId, amount, currency);
    }

    /** Same scheme as Stripe: HMAC-SHA256 over "timestamp.payload". */
    private static String sign(String payload, String secret) throws Exception {
        long timestamp = Instant.now().getEpochSecond();
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = HexFormat.of().formatHex(mac.doFinal((timestamp + "." + payload)
                .getBytes(StandardCharsets.UTF_8)));
        return "t=" + timestamp + ",v1=" + signature;
    }
}
