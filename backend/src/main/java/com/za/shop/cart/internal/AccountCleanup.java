package com.za.shop.cart.internal;

import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

import com.za.shop.cart.CartOwner;
import com.za.shop.cart.CartService;
import com.za.shop.identity.AccountDeleted;

/** A deleted customer's cart is erased with the account. */
@Component
class AccountCleanup {

    private final CartService carts;

    AccountCleanup(CartService carts) {
        this.carts = carts;
    }

    @ApplicationModuleListener
    void on(AccountDeleted event) {
        carts.clear(new CartOwner.Customer(event.userId()));
    }
}
