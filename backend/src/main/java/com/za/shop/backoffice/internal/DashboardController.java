package com.za.shop.backoffice.internal;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.za.shop.catalog.CatalogLookup;
import com.za.shop.catalog.VariantView;
import com.za.shop.inventory.InventoryService;
import com.za.shop.inventory.StockLevel;
import com.za.shop.orders.OrderStatistics;
import com.za.shop.orders.OrderStatus;
import com.za.shop.orders.OrderSummaryView;
import com.za.shop.shared.Money;
import com.za.shop.shared.ShopProperties;

import io.swagger.v3.oas.annotations.tags.Tag;

/** Composes figures from the orders, inventory and catalog modules for the admin dashboard. */
@RestController
@Tag(name = "Admin: dashboard")
class DashboardController {

    private static final int LOW_STOCK_THRESHOLD = 2;

    record Revenue(Money today, Money last7Days, Money last30Days) {
    }

    record OrderCounts(long today, long last7Days, long last30Days, long pendingPayment, long toShip) {
    }

    record LowStockItem(UUID variantId, UUID productId, String productName, String sku, String size, String color,
            int available) {
    }

    record Dashboard(Revenue revenue, OrderCounts orders, List<LowStockItem> lowStock,
            List<OrderSummaryView> recentOrders) {
    }

    private final OrderStatistics orders;
    private final InventoryService inventory;
    private final CatalogLookup catalog;
    private final ShopProperties shop;
    private final Clock clock;

    DashboardController(OrderStatistics orders, InventoryService inventory, CatalogLookup catalog, ShopProperties shop,
            Clock clock) {
        this.orders = orders;
        this.inventory = inventory;
        this.catalog = catalog;
        this.shop = shop;
        this.clock = clock;
    }

    @GetMapping("/api/v1/admin/dashboard")
    Dashboard dashboard() {
        Instant now = clock.instant();
        Instant startOfDay = now.atZone(ZoneOffset.UTC).truncatedTo(ChronoUnit.DAYS).toInstant();
        var today = orders.paidSince(startOfDay);
        var week = orders.paidSince(now.minus(Duration.ofDays(7)));
        var month = orders.paidSince(now.minus(Duration.ofDays(30)));

        List<StockLevel> low = inventory.lowStock(LOW_STOCK_THRESHOLD, 10);
        Map<UUID, VariantView> variants = catalog.variants(low.stream().map(StockLevel::variantId).toList());
        List<LowStockItem> lowStock = low.stream().filter(l -> variants.containsKey(l.variantId())).map(l -> {
            VariantView v = variants.get(l.variantId());
            return new LowStockItem(v.variantId(), v.productId(), v.productName(), v.sku(), v.size(), v.color(),
                    l.available());
        }).toList();

        return new Dashboard(
                new Revenue(money(today.revenueCents()), money(week.revenueCents()), money(month.revenueCents())),
                new OrderCounts(today.orders(), week.orders(), month.orders(), orders.count(OrderStatus.PENDING_PAYMENT),
                        orders.count(OrderStatus.PAID)),
                lowStock, orders.recent(8));
    }

    private Money money(long cents) {
        return Money.of(cents, shop.currency());
    }
}
