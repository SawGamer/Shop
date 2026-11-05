package com.za.shop.identity.internal;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, String> {

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from EmailVerificationToken t where t.userId = :userId")
    int deleteByUserId(java.util.UUID userId);
}
