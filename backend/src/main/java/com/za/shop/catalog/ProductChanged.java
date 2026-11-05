package com.za.shop.catalog;

import java.util.UUID;

/** Anything about a product (fields, variants, images, status) changed; read models should refresh it. */
public record ProductChanged(UUID productId) {
}
