package com.za.shop.payments.internal;

import java.sql.Timestamp;
import java.time.Clock;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;

import io.swagger.v3.oas.annotations.Hidden;

/**
 * Receives Stripe events. Every event is signature-checked, de-duplicated by its id (Stripe delivers
 * at least once) and the paid amount is compared with the expected amount before an order is paid.
 */
@RestController
@Hidden
@ConditionalOnProperty(name = "shop.payments.provider", havingValue = "stripe")
class StripeWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

    private final StripeWebhookHandler handler;
    private final PaymentProperties properties;

    StripeWebhookController(StripeWebhookHandler handler, PaymentProperties properties) {
        this.handler = handler;
        this.properties = properties;
    }

    @PostMapping("/api/v1/payments/stripe/webhook")
    ResponseEntity<Void> receive(@RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        Event event;
        try {
            event = Webhook.constructEvent(payload, signature, properties.stripe().webhookSecret());
        }
        catch (SignatureVerificationException | RuntimeException e) {
            log.warn("Rejected Stripe webhook: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
        handler.handle(event);
        return ResponseEntity.ok().build();
    }

    @Service
    @ConditionalOnProperty(name = "shop.payments.provider", havingValue = "stripe")
    static class StripeWebhookHandler {

        private final PaymentSessionRepository sessions;
        private final PaymentTransitions transitions;
        private final JdbcClient jdbc;
        private final Clock clock;

        StripeWebhookHandler(PaymentSessionRepository sessions, PaymentTransitions transitions, JdbcClient jdbc,
                Clock clock) {
            this.sessions = sessions;
            this.transitions = transitions;
            this.jdbc = jdbc;
            this.clock = clock;
        }

        @Transactional
        public void handle(Event event) {
            int inserted = jdbc.sql("""
                    insert into processed_webhook_events (event_id, provider, processed_at)
                    values (:id, 'stripe', :now) on conflict do nothing""")
                    .param("id", event.getId()).param("now", Timestamp.from(clock.instant())).update();
            if (inserted == 0) {
                return; // duplicate delivery
            }
            switch (event.getType()) {
                case "checkout.session.completed" -> checkoutSession(event).ifPresent(cs -> {
                    if ("paid".equals(cs.getPaymentStatus()) || "no_payment_required".equals(cs.getPaymentStatus())) {
                        succeed(cs);
                    }
                });
                case "checkout.session.async_payment_succeeded" -> checkoutSession(event).ifPresent(this::succeed);
                case "checkout.session.expired", "checkout.session.async_payment_failed" ->
                        checkoutSession(event).flatMap(this::local).ifPresent(transitions::expired);
                default -> log.debug("Ignoring Stripe event {}", event.getType());
            }
        }

        private void succeed(Session checkout) {
            local(checkout).ifPresent(session -> {
                Long paid = checkout.getAmountTotal();
                if (paid == null || paid != session.getAmountCents()
                        || !session.getCurrency().equalsIgnoreCase(checkout.getCurrency())) {
                    log.error("Stripe session {} paid {} {} but {} {} was expected; not marking the order paid",
                            checkout.getId(), paid, checkout.getCurrency(), session.getAmountCents(),
                            session.getCurrency());
                    return;
                }
                transitions.succeeded(session);
            });
        }

        private Optional<PaymentSession> local(Session checkout) {
            Optional<PaymentSession> session = sessions.findByProviderAndProviderSessionId("stripe", checkout.getId());
            if (session.isEmpty()) {
                log.warn("Stripe webhook for unknown checkout session {}", checkout.getId());
            }
            return session;
        }

        private static Optional<Session> checkoutSession(Event event) {
            EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
            StripeObject object = deserializer.getObject().orElse(null);
            if (object == null) {
                try {
                    object = deserializer.deserializeUnsafe(); // event created with a different API version
                }
                catch (EventDataObjectDeserializationException e) {
                    log.error("Could not read Stripe event {}: {}", event.getId(), e.getMessage());
                    return Optional.empty();
                }
            }
            return object instanceof Session session ? Optional.of(session) : Optional.empty();
        }
    }
}
