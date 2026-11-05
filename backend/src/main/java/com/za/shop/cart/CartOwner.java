package com.za.shop.cart;

import java.util.UUID;

/** Whose cart: an anonymous visitor (identified by a random cart id) or a logged-in customer. */
public sealed interface CartOwner {

    String key();

    record Guest(UUID cartId) implements CartOwner {
        @Override
        public String key() {
            return "cart:g:" + cartId;
        }
    }

    record Customer(UUID userId) implements CartOwner {
        @Override
        public String key() {
            return "cart:u:" + userId;
        }
    }
}
