package com.za.shop.orders;

import java.time.Instant;
import java.util.UUID;

import com.za.shop.shared.Money;

public record OrderSummaryView(UUID id, String orderNumber, OrderStatus status, Money total, int itemCount,
        Instant createdAt, String customerEmail) {
}
