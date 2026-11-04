package com.za.shop.orders.internal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.za.shop.orders.OrderStatus;
import com.za.shop.orders.OrderSummaryView;
import com.za.shop.shared.Money;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

final class OrderDtos {

    private OrderDtos() {
    }

    record AddressDto(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Size(max = 160) String line1,
            @Size(max = 160) String line2,
            @NotBlank @Size(max = 20) String postalCode,
            @NotBlank @Size(max = 80) String city,
            @NotBlank @Pattern(regexp = "^[A-Z]{2}$", message = "must be an ISO-3166 alpha-2 code like DE") String country,
            @Size(max = 40) String phone) {

        ShippingAddress toAddress() {
            return new ShippingAddress(fullName.trim(), line1.trim(), blankToNull(line2), postalCode.trim(),
                    city.trim(), country, blankToNull(phone));
        }

        static AddressDto of(ShippingAddress a) {
            return new AddressDto(a.fullName(), a.line1(), a.line2(), a.postalCode(), a.city(), a.country(),
                    a.phone());
        }

        private static String blankToNull(String value) {
            return value == null || value.isBlank() ? null : value.trim();
        }
    }

    record CheckoutRequest(@NotNull @Valid AddressDto shippingAddress) {
    }

    record CheckoutResponse(UUID orderId, String orderNumber, String paymentUrl) {
    }

    record StatusChangeRequest(@NotNull OrderStatus status) {
    }

    record OrderLineDto(UUID variantId, String productSlug, String productName, String sku, String size, String color,
            String imageUrl, Money unitPrice, int quantity, Money lineTotal) {
    }

    record OrderDto(UUID id, String orderNumber, OrderStatus status, String customerEmail, List<OrderLineDto> lines,
            Money subtotal, Money shipping, Money total, AddressDto shippingAddress, Instant createdAt, Instant paidAt,
            Instant shippedAt, Instant deliveredAt, Instant cancelledAt, String paymentUrl) {

        static OrderDto of(Order o) {
            String c = o.getCurrency();
            return new OrderDto(o.getId(), o.getOrderNumber(), o.getStatus(), o.getCustomerEmail(),
                    o.getLines().stream().map(l -> new OrderLineDto(l.getVariantId(), l.getProductSlug(),
                            l.getProductName(), l.getSku(), l.getSize(), l.getColor(), l.getImageUrl(),
                            Money.of(l.getUnitPriceCents(), c), l.getQuantity(), Money.of(l.getLineTotalCents(), c)))
                            .toList(),
                    Money.of(o.getSubtotalCents(), c), Money.of(o.getShippingCents(), c),
                    Money.of(o.getTotalCents(), c), AddressDto.of(o.getShippingAddress()), o.getCreatedAt(),
                    o.getPaidAt(), o.getShippedAt(), o.getDeliveredAt(), o.getCancelledAt(),
                    o.getStatus() == OrderStatus.PENDING_PAYMENT ? o.getPaymentUrl() : null);
        }
    }

    static OrderSummaryView summary(Order o) {
        return new OrderSummaryView(o.getId(), o.getOrderNumber(), o.getStatus(),
                Money.of(o.getTotalCents(), o.getCurrency()), o.itemCount(), o.getCreatedAt(), o.getCustomerEmail());
    }
}
