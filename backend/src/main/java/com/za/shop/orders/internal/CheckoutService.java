package com.za.shop.orders.internal;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.za.shop.cart.CartOwner;
import com.za.shop.cart.CartService;
import com.za.shop.cart.CartView;
import com.za.shop.payments.PaymentRequest;
import com.za.shop.payments.PaymentService;
import com.za.shop.shared.ApiException;
import com.za.shop.shared.CurrentUser.AuthenticatedUser;

/**
 * Orchestrates checkout: (1) place order + reserve stock in one transaction, (2) open a payment session
 * with the provider outside of any transaction, (3) remember the session on the order. If step 2 fails,
 * the order is cancelled again so its stock is released immediately.
 */
@Service
class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);

    record CheckoutResult(UUID orderId, String orderNumber, String paymentUrl) {
    }

    private final CartService carts;
    private final OrderService orders;
    private final PaymentService payments;

    CheckoutService(CartService carts, OrderService orders, PaymentService payments) {
        this.carts = carts;
        this.orders = orders;
        this.payments = payments;
    }

    CheckoutResult checkout(AuthenticatedUser customer, ShippingAddress address) {
        CartView cart = carts.view(new CartOwner.Customer(customer.id()));
        if (cart.isEmpty()) {
            throw ApiException.badRequest("EMPTY_CART", "Your cart is empty");
        }
        Order order = orders.place(customer, address, cart);
        PaymentService.PaymentSessionInfo session;
        try {
            session = payments.createCheckout(new PaymentRequest(order.getId(), customer.id(), order.getOrderNumber(),
                    customer.email(), order.getCurrency(), order.getLines().stream()
                            .map(l -> new PaymentRequest.Line(l.getProductName(), l.details(), l.getUnitPriceCents(),
                                    l.getQuantity(), l.getImageUrl()))
                            .toList(),
                    order.getShippingCents(), order.getTotalCents()));
        }
        catch (RuntimeException e) {
            orders.cancelIfPending(order.getId(), "payment provider error");
            if (e instanceof ApiException api) {
                throw api;
            }
            log.error("Could not start payment for order {}", order.getOrderNumber(), e);
            throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "PAYMENT_PROVIDER_ERROR",
                    "The payment provider is not reachable, please try again");
        }
        orders.attachPayment(order.getId(), session.sessionId(), session.paymentUrl());
        return new CheckoutResult(order.getId(), order.getOrderNumber(), session.paymentUrl());
    }
}
