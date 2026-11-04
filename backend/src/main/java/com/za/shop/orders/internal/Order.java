package com.za.shop.orders.internal;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.za.shop.orders.OrderStatus;
import com.za.shop.shared.ApiException;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * Order aggregate with an explicit state machine:
 * PENDING_PAYMENT → PAID → SHIPPED → DELIVERED, and PENDING_PAYMENT → CANCELLED.
 */
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    private String orderNumber;

    private UUID userId;

    private String customerEmail;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    private String currency;

    private long subtotalCents;

    private long shippingCents;

    private long totalCents;

    @Embedded
    private ShippingAddress shippingAddress;

    private UUID paymentSessionId;

    private String paymentUrl;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position asc")
    private List<OrderLine> lines = new ArrayList<>();

    private Instant createdAt;

    private Instant updatedAt;

    private Instant expiresAt;

    private Instant paidAt;

    private Instant shippedAt;

    private Instant deliveredAt;

    private Instant cancelledAt;

    @Version
    private Long version;

    protected Order() {
    }

    Order(String orderNumber, UUID userId, String customerEmail, String currency, ShippingAddress shippingAddress,
            long shippingCents, Instant now, Instant expiresAt) {
        this.orderNumber = orderNumber;
        this.userId = userId;
        this.customerEmail = customerEmail;
        this.currency = currency;
        this.shippingAddress = shippingAddress;
        this.shippingCents = shippingCents;
        this.status = OrderStatus.PENDING_PAYMENT;
        this.createdAt = now;
        this.updatedAt = now;
        this.expiresAt = expiresAt;
    }

    void addLine(UUID variantId, UUID productId, String productSlug, String productName, String sku, String size,
            String color, String imageUrl, long unitPriceCents, int quantity) {
        lines.add(new OrderLine(this, lines.size(), variantId, productId, productSlug, productName, sku, size, color,
                imageUrl, unitPriceCents, quantity));
        subtotalCents = lines.stream().mapToLong(OrderLine::getLineTotalCents).sum();
        totalCents = subtotalCents + shippingCents;
    }

    void attachPayment(UUID paymentSessionId, String paymentUrl, Instant now) {
        this.paymentSessionId = paymentSessionId;
        this.paymentUrl = paymentUrl;
        this.updatedAt = now;
    }

    void markPaid(Instant now) {
        require(status == OrderStatus.PENDING_PAYMENT || status == OrderStatus.CANCELLED, "pay");
        status = OrderStatus.PAID;
        paidAt = now;
        cancelledAt = null;
        updatedAt = now;
    }

    void markShipped(Instant now) {
        require(status == OrderStatus.PAID, "ship");
        status = OrderStatus.SHIPPED;
        shippedAt = now;
        updatedAt = now;
    }

    void markDelivered(Instant now) {
        require(status == OrderStatus.SHIPPED, "mark as delivered");
        status = OrderStatus.DELIVERED;
        deliveredAt = now;
        updatedAt = now;
    }

    void cancel(Instant now) {
        require(status == OrderStatus.PENDING_PAYMENT, "cancel");
        status = OrderStatus.CANCELLED;
        cancelledAt = now;
        updatedAt = now;
    }

    private void require(boolean allowed, String action) {
        if (!allowed) {
            throw ApiException.conflict("INVALID_STATE_TRANSITION",
                    "Cannot " + action + " an order that is " + status.name().toLowerCase().replace('_', ' '));
        }
    }

    public int itemCount() {
        return lines.stream().mapToInt(OrderLine::getQuantity).sum();
    }

    public UUID getId() {
        return id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public String getCurrency() {
        return currency;
    }

    public long getSubtotalCents() {
        return subtotalCents;
    }

    public long getShippingCents() {
        return shippingCents;
    }

    public long getTotalCents() {
        return totalCents;
    }

    public ShippingAddress getShippingAddress() {
        return shippingAddress;
    }

    public String getPaymentUrl() {
        return paymentUrl;
    }

    public List<OrderLine> getLines() {
        return lines;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public Instant getShippedAt() {
        return shippedAt;
    }

    public Instant getDeliveredAt() {
        return deliveredAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }
}
