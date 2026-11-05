package com.za.shop.payments.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentSessionRepository extends JpaRepository<PaymentSession, UUID> {

    Optional<PaymentSession> findByProviderAndProviderSessionId(String provider, String providerSessionId);

    List<PaymentSession> findByOrderIdAndStatus(UUID orderId, PaymentSession.Status status);
}
