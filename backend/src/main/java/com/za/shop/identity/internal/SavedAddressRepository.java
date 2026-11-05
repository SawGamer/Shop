package com.za.shop.identity.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface SavedAddressRepository extends JpaRepository<SavedAddress, UUID> {

    @Query("select a from SavedAddress a where a.userId = :userId order by a.isDefault desc, a.createdAt desc")
    List<SavedAddress> findAllOf(UUID userId);

    Optional<SavedAddress> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);

    /** Done in SQL first, so the "one default per customer" index is never violated when another one is set. */
    @Modifying(flushAutomatically = true)
    @Query("update SavedAddress a set a.isDefault = false where a.userId = :userId and a.isDefault = true")
    int clearDefault(UUID userId);

    @Modifying
    @Query("delete from SavedAddress a where a.userId = :userId")
    int deleteByUserId(UUID userId);
}
