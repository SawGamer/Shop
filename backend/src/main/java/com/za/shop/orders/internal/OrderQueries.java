package com.za.shop.orders.internal;

import java.util.Locale;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.orders.OrderStatus;
import com.za.shop.orders.OrderSummaryView;
import com.za.shop.orders.internal.OrderDtos.OrderDto;
import com.za.shop.shared.ApiException;
import com.za.shop.shared.PageResponse;
import com.za.shop.shared.Paging;

@Service
@Transactional(readOnly = true)
class OrderQueries {

    private final OrderRepository orders;

    OrderQueries(OrderRepository orders) {
        this.orders = orders;
    }

    PageResponse<OrderSummaryView> ofCustomer(UUID userId, Integer page, Integer pageSize) {
        return PageResponse.of(orders.findByUserId(userId,
                Paging.of(page, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"))), OrderDtos::summary);
    }

    /** 404 (not 403) for other people's orders, so order ids can't be probed. */
    OrderDto ofCustomer(UUID userId, UUID orderId) {
        return orders.findById(orderId).filter(o -> o.getUserId().equals(userId)).map(OrderDto::of)
                .orElseThrow(() -> ApiException.notFound("Order"));
    }

    OrderDto any(UUID orderId) {
        return orders.findById(orderId).map(OrderDto::of).orElseThrow(() -> ApiException.notFound("Order"));
    }

    PageResponse<OrderSummaryView> search(OrderStatus status, String q, Integer page, Integer pageSize) {
        Specification<Order> spec = (root, query, cb) -> cb.conjunction();
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase(Locale.ROOT).replace("%", "\\%").replace("_", "\\_") + "%";
            spec = spec.and((root, query, cb) -> cb.or(cb.like(cb.lower(root.get("orderNumber")), like),
                    cb.like(root.get("customerEmail"), like)));
        }
        return PageResponse.of(orders.findAll(spec, Paging.of(page, pageSize,
                Sort.by(Sort.Direction.DESC, "createdAt"))), OrderDtos::summary);
    }
}
