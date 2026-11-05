package com.za.shop.shared;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/** Stable JSON page envelope (never serialize Spring's {@code PageImpl} directly). */
public record PageResponse<T>(List<T> items, int page, int pageSize, long totalItems, int totalPages) {

    public static <E, T> PageResponse<T> of(Page<E> page, Function<? super E, ? extends T> mapper) {
        return new PageResponse<>(page.getContent().stream().<T>map(mapper).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    public static <T> PageResponse<T> of(List<T> items, int page, int pageSize, long totalItems) {
        int totalPages = pageSize == 0 ? 0 : (int) Math.ceil((double) totalItems / pageSize);
        return new PageResponse<>(items, page, pageSize, totalItems, totalPages);
    }
}
