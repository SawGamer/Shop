package com.za.shop.identity.internal;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {

    boolean existsByUserIdAndCreatedAtAfter(UUID userId, Instant after);

    @Modifying
    @Query("delete from PasswordResetToken t where t.userId = :userId")
    int deleteByUserId(UUID userId);
}
