package com.za.shop.identity;

import java.util.UUID;

/** A customer deleted their account; other modules erase what they hold about them (e.g. the cart). */
public record AccountDeleted(UUID userId) {
}
