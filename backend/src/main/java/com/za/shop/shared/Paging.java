package com.za.shop.shared;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/** Clamps client supplied paging parameters so nobody can request a million rows at once. */
public final class Paging {

    public static final int DEFAULT_PAGE_SIZE = 24;
    public static final int MAX_PAGE_SIZE = 100;

    private Paging() {
    }

    public static int page(Integer page) {
        return page == null || page < 0 ? 0 : page;
    }

    public static int pageSize(Integer pageSize) {
        if (pageSize == null || pageSize <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(pageSize, MAX_PAGE_SIZE);
    }

    public static PageRequest of(Integer page, Integer pageSize, Sort sort) {
        return PageRequest.of(page(page), pageSize(pageSize), sort);
    }
}
