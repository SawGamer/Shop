package com.za.shop.payments.internal;

import java.time.Clock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.payments.PaymentEvents.PaymentCancelled;
import com.za.shop.payments.PaymentEvents.PaymentExpired;
import com.za.shop.payments.PaymentEvents.PaymentSucceeded;

/** Moves payment sessions between states and publishes the outcome exactly once per session. */
@Service
public class PaymentTransitions {

    private static final Logger log = LoggerFactory.getLogger(PaymentTransitions.class);

    private final ApplicationEventPublisher events;
    private final Clock clock;

    PaymentTransitions(ApplicationEventPublisher events, Clock clock) {
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public void succeeded(PaymentSession session) {
        if (session.markSucceeded(clock.instant())) {
            log.info("Payment {} for order {} succeeded", session.getId(), session.getOrderId());
            events.publishEvent(new PaymentSucceeded(session.getOrderId(), session.getId()));
        }
    }

    @Transactional
    public void expired(PaymentSession session) {
        if (session.close(PaymentSession.Status.EXPIRED, clock.instant())) {
            events.publishEvent(new PaymentExpired(session.getOrderId(), session.getId()));
        }
    }

    @Transactional
    public void cancelled(PaymentSession session) {
        if (session.close(PaymentSession.Status.CANCELLED, clock.instant())) {
            events.publishEvent(new PaymentCancelled(session.getOrderId(), session.getId()));
        }
    }
}
