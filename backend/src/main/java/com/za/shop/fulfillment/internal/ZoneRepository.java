package com.za.shop.fulfillment.internal;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ZoneRepository extends JpaRepository<Zone, UUID> {
}
