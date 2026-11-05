package com.za.shop.orders.internal;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.cart.CartOwner;
import com.za.shop.cart.CartService;
import com.za.shop.cart.CartView;
import com.za.shop.catalog.CatalogLookup;
import com.za.shop.catalog.VariantView;
import com.za.shop.inventory.InventoryService;
import com.za.shop.inventory.StockLevel;
import com.za.shop.shared.ApiException;

/** "Buy again": puts the items of a past order into the customer's cart, as far as they are still available. */
@Service
class OrderReorder {

    record Skipped(String productName, String reason) {
    }

    record Result(CartView cart, int added, List<Skipped> skipped) {
    }

    private final OrderRepository orders;
    private final CartService carts;
    private final CatalogLookup catalog;
    private final InventoryService inventory;

    OrderReorder(OrderRepository orders, CartService carts, CatalogLookup catalog, InventoryService inventory) {
        this.orders = orders;
        this.carts = carts;
        this.catalog = catalog;
        this.inventory = inventory;
    }

    @Transactional(readOnly = true)
    Result reorder(UUID userId, UUID orderId) {
        // 404 for other people's orders, like everywhere else.
        Order order = orders.findById(orderId).filter(o -> o.getUserId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("Order"));
        CartOwner owner = new CartOwner.Customer(userId);

        Map<UUID, Integer> wanted = new LinkedHashMap<>();
        Map<UUID, String> names = new LinkedHashMap<>();
        order.getLines().forEach(l -> {
            wanted.merge(l.getVariantId(), l.getQuantity(), Integer::sum);
            names.putIfAbsent(l.getVariantId(), l.getProductName());
        });
        Map<UUID, VariantView> variants = catalog.variants(wanted.keySet());
        Map<UUID, StockLevel> stock = inventory.levels(wanted.keySet());
        Map<UUID, Integer> inCart = carts.quantities(owner);

        int added = 0;
        List<Skipped> skipped = new ArrayList<>();
        for (Map.Entry<UUID, Integer> line : wanted.entrySet()) {
            UUID variantId = line.getKey();
            VariantView variant = variants.get(variantId);
            if (variant == null || !variant.purchasable()) {
                skipped.add(new Skipped(names.get(variantId), "UNAVAILABLE"));
                continue;
            }
            int room = Math.min(stock.get(variantId).available(), CartService.MAX_QUANTITY)
                    - inCart.getOrDefault(variantId, 0);
            if (room <= 0) {
                skipped.add(new Skipped(names.get(variantId), "OUT_OF_STOCK"));
                continue;
            }
            int quantity = Math.min(line.getValue(), room);
            carts.add(owner, variantId, quantity);
            added += quantity;
        }
        return new Result(carts.view(owner), added, skipped);
    }
}
