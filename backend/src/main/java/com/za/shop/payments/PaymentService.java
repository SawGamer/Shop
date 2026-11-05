package com.za.shop.payments;

import java.time.Clock;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.za.shop.payments.internal.PaymentGateway;
import com.za.shop.payments.internal.PaymentSession;
import com.za.shop.payments.internal.PaymentSessionRepository;

/**
 * Starts hosted payment sessions. The call to the provider happens outside any database transaction,
 * so a slow provider never holds database connections or row locks.
 */
@Service
public class PaymentService {

    public record PaymentSessionInfo(UUID sessionId, String paymentUrl) {
    }

    private final PaymentSessionRepository sessions;
    private final PaymentGateway gateway;
    private final TransactionTemplate tx;
    private final Clock clock;

    PaymentService(PaymentSessionRepository sessions, PaymentGateway gateway, TransactionTemplate tx, Clock clock) {
        this.sessions = sessions;
        this.gateway = gateway;
        this.tx = tx;
        this.clock = clock;
    }

    public PaymentSessionInfo createCheckout(PaymentRequest request) {
        PaymentSession session = tx.execute(status -> sessions.save(new PaymentSession(request.orderId(),
                request.userId(), gateway.provider(), request.totalCents(), request.currency(), clock.instant())));
        PaymentGateway.ProviderSession created;
        try {
            created = gateway.create(session.getId(), request);
        }
        catch (RuntimeException e) {
            tx.executeWithoutResult(status -> sessions.findById(session.getId())
                    .ifPresent(s -> s.closeSilently(clock.instant())));
            throw e;
        }
        tx.executeWithoutResult(status -> sessions.findById(session.getId()).orElseThrow()
                .attach(created.providerSessionId(), created.url(), clock.instant()));
        return new PaymentSessionInfo(session.getId(), created.url());
    }

    /** The order was cancelled: close its open sessions so the customer can no longer pay. */
    public void cancelOpenSessions(UUID orderId) {
        for (PaymentSession session : sessions.findByOrderIdAndStatus(orderId, PaymentSession.Status.OPEN)) {
            gateway.expire(session);
            tx.executeWithoutResult(status -> sessions.findById(session.getId())
                    .ifPresent(s -> s.closeSilently(clock.instant())));
        }
    }
}
