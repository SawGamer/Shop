package com.za.shop.fulfillment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import com.za.shop.IntegrationTest;

/** Delivery zones, slots, pickup, minimum order and reorder, end to end. Each test books different slots. */
class FulfillmentTests extends IntegrationTest {

    private final List<String> zoneIds = new ArrayList<>();
    private final List<String> locationIds = new ArrayList<>();

    @AfterEach
    void restoreShippingMode() throws Exception {
        Session admin = admin();
        for (String id : zoneIds) {
            mvc.perform(delete("/api/v1/admin/fulfillment/zones/{id}", id).header("Authorization", admin.bearer()));
        }
        for (String id : locationIds) {
            mvc.perform(delete("/api/v1/admin/fulfillment/locations/{id}", id).header("Authorization", admin.bearer()));
        }
        mvc.perform(put("/api/v1/admin/fulfillment/mode").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"mode\":\"SHIPPING\"}"));
    }

    // ───────────── helpers ─────────────

    private static String prefix() {
        return "T" + (10000 + new Random().nextInt(89999));
    }

    private void enableLocal(Session admin, int capacity) throws Exception {
        mvc.perform(put("/api/v1/admin/fulfillment/mode").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"mode\":\"LOCAL\"}")).andExpect(status().isOk());
        StringBuilder hours = new StringBuilder();
        for (int day = 1; day <= 7; day++) {
            hours.append(day > 1 ? "," : "").append("{\"dayOfWeek\":%d,\"from\":\"07:00\",\"to\":\"22:00\"}".formatted(day));
        }
        mvc.perform(put("/api/v1/admin/fulfillment/schedule").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"slotMinutes":60,"capacityPerSlot":%d,"leadTimeMinutes":0,"horizonDays":3,
                         "openingHours":[%s]}""".formatted(capacity, hours))).andExpect(status().isOk());
    }

    private String zone(Session admin, String name, List<String> prefixes, long fee, Long freeFrom, long min)
            throws Exception {
        String prefixJson = String.join(",", prefixes.stream().map(p -> "\"" + p + "\"").toList());
        String id = read(mvc.perform(post("/api/v1/admin/fulfillment/zones").header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"%s","postcodePrefixes":[%s],"feeCents":%d,"freeFromCents":%s,"minOrderCents":%d}"""
                        .formatted(name, prefixJson, fee, freeFrom, min)))
                .andExpect(status().isCreated()).andReturn(), "$.id");
        zoneIds.add(id);
        return id;
    }

    private String location(Session admin, String name) throws Exception {
        String id = read(mvc.perform(post("/api/v1/admin/fulfillment/locations")
                .header("Authorization", admin.bearer()).contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"%s","address":{"line1":"Marktplatz 7","postalCode":"10117","city":"Berlin","country":"DE"},
                         "openingHours":"Mon–Sat 08:00–20:00"}""".formatted(name)))
                .andExpect(status().isCreated()).andReturn(), "$.id");
        locationIds.add(id);
        return id;
    }

    /** Ids of all bookable slots, earliest first. */
    private List<String> deliverySlots(String postcode) throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/fulfillment/slots").param("method", "DELIVERY")
                .param("postcode", postcode).param("days", "3")).andExpect(status().isOk()).andReturn();
        return read(result, "$[*].slots[*].id");
    }

    private int remaining(String postcode, String slotId) throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/fulfillment/slots").param("method", "DELIVERY")
                .param("postcode", postcode).param("days", "3")).andReturn();
        List<Integer> values = read(result, "$[*].slots[?(@.id == '" + slotId + "')].remaining");
        return values.isEmpty() ? 0 : values.getFirst();
    }

    private Session customerWithItem(String variantId, int quantity) throws Exception {
        Session customer = register(uniqueEmail());
        mvc.perform(post("/api/v1/cart/items").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variantId\":\"" + variantId + "\",\"quantity\":" + quantity + "}"))
                .andExpect(status().isOk());
        return customer;
    }

    private static String delivery(String postcode, String slotId) {
        return """
                {"shippingAddress":{"fullName":"Erika Mustermann","line1":"Hauptstraße 1","postalCode":"%s","city":"Berlin","country":"DE"},
                 "fulfillment":{"method":"DELIVERY","slotId":"%s"}}""".formatted(postcode, slotId);
    }

    private ResultActions checkout(Session customer, String body) throws Exception {
        return mvc.perform(post("/api/v1/checkout").header("Authorization", customer.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    // ───────────── tests ─────────────

    @Test
    void zoneAndSlotEndpointsOnlyExistInLocalMode() throws Exception {
        mvc.perform(get("/api/v1/fulfillment/zone").param("postcode", "10115"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("FULFILLMENT_DISABLED"));

        Session admin = admin();
        enableLocal(admin, 2);
        String p = prefix();
        zone(admin, "Zone " + p, List.of(p), 490, 5000L, 2000);
        mvc.perform(get("/api/v1/fulfillment/zone").param("postcode", p + "7"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Zone " + p))
                .andExpect(jsonPath("$.minOrderCents").value(2000));
        mvc.perform(get("/api/v1/fulfillment/zone").param("postcode", " " + p.toLowerCase() + " 7 "))
                .andExpect(status().isOk()); // spaces and case don't matter
        mvc.perform(get("/api/v1/fulfillment/zone").param("postcode", "ZZZZZ"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void theLongestMatchingPrefixDecidesTheZone() throws Exception {
        Session admin = admin();
        enableLocal(admin, 2);
        String p = prefix();
        zone(admin, "Wide " + p, List.of(p), 900, null, 0);
        zone(admin, "Narrow " + p, List.of(p + "1"), 400, null, 0);
        mvc.perform(get("/api/v1/fulfillment/zone").param("postcode", p + "19"))
                .andExpect(jsonPath("$.name").value("Narrow " + p));
        mvc.perform(get("/api/v1/fulfillment/zone").param("postcode", p + "29"))
                .andExpect(jsonPath("$.name").value("Wide " + p));
    }

    @Test
    void slotsAreListedPerDayAndOnlyForServedAreasAndKnownStores() throws Exception {
        Session admin = admin();
        enableLocal(admin, 2);
        String p = prefix();
        zone(admin, "Zone " + p, List.of(p), 490, null, 0);

        MvcResult slots = mvc.perform(get("/api/v1/fulfillment/slots").param("method", "DELIVERY")
                .param("postcode", p + "1").param("days", "3")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].date").exists()).andExpect(jsonPath("$[0].slots[0].id").exists())
                .andReturn();
        List<Integer> remaining = read(slots, "$[*].slots[*].remaining");
        assertThat(remaining).isNotEmpty().allMatch(r -> r >= 1 && r <= 2);
        List<String> ids = read(slots, "$[*].slots[*].id");
        assertThat(ids).isSorted().doesNotHaveDuplicates();

        mvc.perform(get("/api/v1/fulfillment/slots").param("method", "DELIVERY").param("postcode", "ZZZZZ"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("NOT_DELIVERABLE"));
        mvc.perform(get("/api/v1/fulfillment/slots").param("method", "PICKUP")
                .param("locationId", "00000000-0000-0000-0000-000000000001")).andExpect(status().isNotFound());
    }

    @Test
    void deliveryCheckoutBooksTheSlotAndChargesTheZoneFee() throws Exception {
        Session admin = admin();
        enableLocal(admin, 2);
        String p = prefix();
        zone(admin, "Mitte " + p, List.of(p), 490, 5000L, 2000);
        var product = createProduct(admin, unique("Milk"), 3000, 20, "1 l");
        String variant = product.variantIds().getFirst();
        List<String> slots = deliverySlots(p + "1");
        String slot = slots.get(0);

        Session customer = customerWithItem(variant, 1);
        String orderId = read(checkout(customer, delivery(p + "1", slot)).andExpect(status().isCreated()).andReturn(),
                "$.orderId");
        mvc.perform(get("/api/v1/orders/{id}", orderId).header("Authorization", customer.bearer()))
                .andExpect(jsonPath("$.fulfillment.method").value("DELIVERY"))
                .andExpect(jsonPath("$.fulfillment.zoneName").value("Mitte " + p))
                .andExpect(jsonPath("$.fulfillment.feeCents").value(490))
                .andExpect(jsonPath("$.fulfillment.locationName").value(nullValue()))
                .andExpect(jsonPath("$.fulfillment.slot.startsAt").exists())
                .andExpect(jsonPath("$.shipping.cents").value(490))
                .andExpect(jsonPath("$.total.cents").value(3490));
        assertThat(remaining(p + "1", slot)).isEqualTo(1);

        // Above the free-delivery threshold the fee disappears.
        Session big = customerWithItem(variant, 2);
        String bigOrder = read(checkout(big, delivery(p + "1", slots.get(1))).andExpect(status().isCreated()).andReturn(),
                "$.orderId");
        mvc.perform(get("/api/v1/orders/{id}", bigOrder).header("Authorization", big.bearer()))
                .andExpect(jsonPath("$.subtotal.cents").value(6000)).andExpect(jsonPath("$.shipping.cents").value(0))
                .andExpect(jsonPath("$.total.cents").value(6000));
    }

    @Test
    void slotsCannotBeOverbookedAndCancellingFreesThem() throws Exception {
        Session admin = admin();
        enableLocal(admin, 2);
        String p = prefix();
        zone(admin, "Zone " + p, List.of(p), 490, null, 0);
        var product = createProduct(admin, unique("Eggs"), 2500, 20, "10 pack");
        String variant = product.variantIds().getFirst();
        String slot = deliverySlots(p + "1").get(3);

        Session first = customerWithItem(variant, 1);
        Session second = customerWithItem(variant, 1);
        Session third = customerWithItem(variant, 1);
        String firstOrder = read(checkout(first, delivery(p + "1", slot)).andExpect(status().isCreated()).andReturn(), "$.orderId");
        checkout(second, delivery(p + "1", slot)).andExpect(status().isCreated());
        assertThat(remaining(p + "1", slot)).isZero();
        assertThat(deliverySlots(p + "1")).doesNotContain(slot); // full slots are not offered any more

        int availableBefore = available(product.slug(), variant);
        checkout(third, delivery(p + "1", slot)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SLOT_UNAVAILABLE"));
        // The failed checkout reserved nothing.
        assertThat(available(product.slug(), variant)).isEqualTo(availableBefore);

        // The shop cancels the first (unpaid) order: its slot becomes bookable again.
        mvc.perform(post("/api/v1/admin/orders/{id}/status", firstOrder).header("Authorization", admin.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CANCELLED\"}")).andExpect(status().isOk());
        assertThat(remaining(p + "1", slot)).isEqualTo(1);
        checkout(third, delivery(p + "1", slot)).andExpect(status().isCreated());
    }

    @Test
    void minimumOrderDeliverabilityAndMissingChoiceAreRejected() throws Exception {
        Session admin = admin();
        enableLocal(admin, 2);
        String p = prefix();
        zone(admin, "Zone " + p, List.of(p), 490, null, 10000);
        var product = createProduct(admin, unique("Bread"), 3000, 20, "800 g");
        String variant = product.variantIds().getFirst();
        String slot = deliverySlots(p + "1").get(5);
        Session customer = customerWithItem(variant, 1);

        checkout(customer, delivery(p + "1", slot)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BELOW_MINIMUM_ORDER"))
                .andExpect(jsonPath("$.minOrder.cents").value(10000)).andExpect(jsonPath("$.subtotal.cents").value(3000));
        checkout(customer, delivery("ZZZZZ", slot)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NOT_DELIVERABLE")).andExpect(jsonPath("$.errors.postalCode").exists());
        checkout(customer, CheckoutFlowTestsAddress.BODY).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED")).andExpect(jsonPath("$.errors.fulfillment").exists());
        checkout(customer, delivery(p + "1", "123")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SLOT_UNAVAILABLE")); // not a slot the shop offers
        mvc.perform(get("/api/v1/cart").header("Authorization", customer.bearer()))
                .andExpect(jsonPath("$.itemCount").value(1)); // nothing was lost
    }

    @Test
    void pickupUsesTheStoreAddressHasNoFeeAndItsOwnSlotCounters() throws Exception {
        Session admin = admin();
        enableLocal(admin, 2);
        String p = prefix();
        zone(admin, "Zone " + p, List.of(p), 490, null, 99999); // the delivery minimum must not block pickups
        String store = location(admin, "Store " + p);
        var product = createProduct(admin, unique("Apples"), 1500, 20, "1 kg");
        String variant = product.variantIds().getFirst();

        MvcResult slots = mvc.perform(get("/api/v1/fulfillment/slots").param("method", "PICKUP")
                .param("locationId", store).param("days", "3")).andExpect(status().isOk()).andReturn();
        String slot = ((List<String>) read(slots, "$[*].slots[*].id")).get(7);
        mvc.perform(get("/api/v1/fulfillment/locations")).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(hasItem("Store " + p)));

        Session customer = customerWithItem(variant, 1);
        String orderId = read(checkout(customer, """
                {"shippingAddress":{"fullName":"Erika Mustermann","line1":"anything","postalCode":"00000","city":"x","country":"DE","phone":"0170 123"},
                 "fulfillment":{"method":"PICKUP","slotId":"%s","locationId":"%s"}}""".formatted(slot, store))
                .andExpect(status().isCreated()).andReturn(), "$.orderId");
        mvc.perform(get("/api/v1/orders/{id}", orderId).header("Authorization", customer.bearer()))
                .andExpect(jsonPath("$.fulfillment.method").value("PICKUP"))
                .andExpect(jsonPath("$.fulfillment.locationName").value("Store " + p))
                .andExpect(jsonPath("$.fulfillment.zoneName").value(nullValue()))
                .andExpect(jsonPath("$.shippingAddress.line1").value("Marktplatz 7")) // the store, not what was sent
                .andExpect(jsonPath("$.shippingAddress.fullName").value("Erika Mustermann"))
                .andExpect(jsonPath("$.shippingAddress.phone").value("0170 123"))
                .andExpect(jsonPath("$.shipping.cents").value(0)).andExpect(jsonPath("$.total.cents").value(1500));

        // Booked at the store only: the same minute as a delivery is still free.
        MvcResult after = mvc.perform(get("/api/v1/fulfillment/slots").param("method", "PICKUP")
                .param("locationId", store).param("days", "3")).andReturn();
        assertThat((List<Integer>) read(after, "$[*].slots[?(@.id == '" + slot + "')].remaining")).containsExactly(1);
        assertThat(remaining(p + "1", slot)).isEqualTo(2);
    }

    @Test
    void buyAgainFillsTheCartAsFarAsItemsAreStillAvailable() throws Exception {
        Session admin = admin();
        var one = createProduct(admin, unique("Coffee"), 1000, 5, "250 g");
        var two = createProduct(admin, unique("Tea"), 800, 5, "100 g");
        var three = createProduct(admin, unique("Honey"), 600, 5, "250 g");
        Session customer = customerWithItem(one.variantIds().getFirst(), 2);
        for (var other : List.of(two, three)) {
            mvc.perform(post("/api/v1/cart/items").header("Authorization", customer.bearer())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"variantId\":\"" + other.variantIds().getFirst() + "\",\"quantity\":1}"))
                    .andExpect(status().isOk());
        }
        MvcResult placed = checkout(customer, """
                {"shippingAddress":{"fullName":"A B","line1":"Hauptstraße 1","postalCode":"10115","city":"Berlin","country":"DE"}}""")
                .andExpect(status().isCreated()).andReturn();
        String orderId = read(placed, "$.orderId");
        String paymentUrl = read(placed, "$.paymentUrl");
        String sessionId = paymentUrl.substring(paymentUrl.indexOf("/pay/") + 5, paymentUrl.indexOf('?'));
        mvc.perform(post("/api/v1/payments/fake/sessions/{id}/complete", sessionId)
                .header("Authorization", customer.bearer())).andExpect(status().isNoContent());
        await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> mvc.perform(get("/api/v1/cart")
                .header("Authorization", customer.bearer())).andExpect(jsonPath("$.itemCount").value(0)));

        // Meanwhile: coffee is nearly sold out, tea is gone, honey is no longer sold.
        setStock(admin, one.variantIds().getFirst(), 1);
        setStock(admin, two.variantIds().getFirst(), 0);
        mvc.perform(delete("/api/v1/admin/products/{id}", three.id()).header("Authorization", admin.bearer()))
                .andExpect(status().isNoContent());

        mvc.perform(post("/api/v1/orders/{id}/reorder", orderId).header("Authorization", customer.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.added").value(1)) // wanted 2 coffees, only 1 left
                .andExpect(jsonPath("$.cart.items.length()").value(1))
                .andExpect(jsonPath("$.cart.items[0].quantity").value(1))
                .andExpect(jsonPath("$.skipped.length()").value(2))
                .andExpect(jsonPath("$.skipped[?(@.reason == 'OUT_OF_STOCK')].productName").value(hasItem(org.hamcrest.Matchers.startsWith("Tea"))))
                .andExpect(jsonPath("$.skipped[?(@.reason == 'UNAVAILABLE')].productName").exists());

        // Someone else's order is not visible.
        mvc.perform(post("/api/v1/orders/{id}/reorder", orderId).header("Authorization", register(uniqueEmail()).bearer()))
                .andExpect(status().isNotFound());
    }

    /** A valid shipping address without any fulfillment choice. */
    static final class CheckoutFlowTestsAddress {
        static final String BODY = """
                {"shippingAddress":{"fullName":"A B","line1":"Hauptstraße 1","postalCode":"10115","city":"Berlin","country":"DE"}}""";
    }
}
