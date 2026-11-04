package com.za.shop.payments.internal;

import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.za.shop.shared.ApiException;
import com.za.shop.shared.CurrentUser;

import io.swagger.v3.oas.annotations.tags.Tag;

/** The "test payment page" provider. Only exists when {@code shop.payments.provider=fake}. */
@RestController
@RequestMapping("/api/v1/payments/fake/sessions/{sessionId}")
@ConditionalOnProperty(name = "shop.payments.provider", havingValue = "fake", matchIfMissing = true)
@Tag(name = "Payments (test provider)")
class FakePaymentController {

    private final PaymentSessionRepository sessions;
    private final PaymentTransitions transitions;

    FakePaymentController(PaymentSessionRepository sessions, PaymentTransitions transitions) {
        this.sessions = sessions;
        this.transitions = transitions;
    }

    @PostMapping("/complete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void complete(@PathVariable UUID sessionId) {
        PaymentSession session = owned(sessionId);
        if (session.getStatus() != PaymentSession.Status.OPEN && session.getStatus() != PaymentSession.Status.SUCCEEDED) {
            throw ApiException.conflict("INVALID_STATE_TRANSITION", "This payment session is closed");
        }
        transitions.succeeded(session);
    }

    @PostMapping("/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void cancel(@PathVariable UUID sessionId) {
        transitions.cancelled(owned(sessionId));
    }

    private PaymentSession owned(UUID sessionId) {
        UUID userId = CurrentUser.require().id();
        return sessions.findById(sessionId).filter(s -> s.getUserId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("Payment session"));
    }
}
