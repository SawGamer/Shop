package com.za.shop.orders.internal;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.za.shop.orders.OrderStatus;
import com.za.shop.orders.OrderSummaryView;
import com.za.shop.orders.internal.OrderDtos.CheckoutRequest;
import com.za.shop.orders.internal.OrderDtos.CheckoutResponse;
import com.za.shop.orders.internal.OrderDtos.OrderDto;
import com.za.shop.orders.internal.OrderDtos.StatusChangeRequest;
import com.za.shop.payments.PaymentService;
import com.za.shop.shared.CurrentUser;
import com.za.shop.shared.PageResponse;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@Tag(name = "Checkout & orders")
class OrderController {

    private final CheckoutService checkout;
    private final OrderService orderService;
    private final OrderQueries queries;
    private final PaymentService payments;

    OrderController(CheckoutService checkout, OrderService orderService, OrderQueries queries,
            PaymentService payments) {
        this.checkout = checkout;
        this.orderService = orderService;
        this.queries = queries;
        this.payments = payments;
    }

    @PostMapping("/api/v1/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    CheckoutResponse checkout(@Valid @RequestBody CheckoutRequest request) {
        var result = checkout.checkout(CurrentUser.require(), request.shippingAddress().toAddress());
        return new CheckoutResponse(result.orderId(), result.orderNumber(), result.paymentUrl());
    }

    @GetMapping("/api/v1/orders")
    PageResponse<OrderSummaryView> myOrders(@RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        return queries.ofCustomer(CurrentUser.require().id(), page, pageSize);
    }

    @GetMapping("/api/v1/orders/{id}")
    OrderDto myOrder(@PathVariable UUID id) {
        return queries.ofCustomer(CurrentUser.require().id(), id);
    }

    @GetMapping("/api/v1/admin/orders")
    PageResponse<OrderSummaryView> allOrders(@RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) String q, @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        return queries.search(status, q, page, pageSize);
    }

    @GetMapping("/api/v1/admin/orders/{id}")
    OrderDto anyOrder(@PathVariable UUID id) {
        return queries.any(id);
    }

    @PostMapping("/api/v1/admin/orders/{id}/status")
    OrderDto changeStatus(@PathVariable UUID id, @Valid @RequestBody StatusChangeRequest request) {
        orderService.transition(id, request.status());
        if (request.status() == OrderStatus.CANCELLED) {
            payments.cancelOpenSessions(id);
        }
        return queries.any(id);
    }
}
