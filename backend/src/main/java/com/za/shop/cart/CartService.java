package com.za.shop.cart;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.za.shop.catalog.CatalogLookup;
import com.za.shop.catalog.VariantView;
import com.za.shop.inventory.InsufficientStockException;
import com.za.shop.inventory.InventoryService;
import com.za.shop.inventory.StockLevel;
import com.za.shop.shared.ApiException;
import com.za.shop.shared.Money;
import com.za.shop.shared.ShopProperties;

/**
 * Carts live in Redis as a hash {@code variantId -> quantity}: fast, shared by all API instances and
 * expiring on their own. Only ids and quantities are stored; everything shown is priced fresh.
 */
@Service
public class CartService {

    public static final int MAX_QUANTITY = 99;
    private static final Duration TTL = Duration.ofDays(30);

    private final StringRedisTemplate redis;
    private final CatalogLookup catalog;
    private final InventoryService inventory;
    private final ShopProperties shop;

    CartService(StringRedisTemplate redis, CatalogLookup catalog, InventoryService inventory, ShopProperties shop) {
        this.redis = redis;
        this.catalog = catalog;
        this.inventory = inventory;
        this.shop = shop;
    }

    public CartView view(CartOwner owner) {
        Map<UUID, Integer> quantities = quantities(owner);
        if (quantities.isEmpty()) {
            return empty(owner);
        }
        Map<UUID, VariantView> variants = catalog.variants(quantities.keySet());
        Map<UUID, StockLevel> stock = inventory.levels(quantities.keySet());
        List<CartView.Item> items = new ArrayList<>();
        List<UUID> gone = new ArrayList<>();
        quantities.forEach((variantId, quantity) -> {
            VariantView v = variants.get(variantId);
            if (v == null || !v.purchasable()) {
                gone.add(variantId); // deleted or unpublished since it was added
                return;
            }
            int available = stock.get(variantId).available();
            Money unit = money(v.priceCents());
            items.add(new CartView.Item(variantId, v.productId(), v.productSlug(), v.productName(), v.sku(), v.size(),
                    v.color(), v.imageUrl(), unit, quantity, unit.times(quantity), available, available > 0));
        });
        if (!gone.isEmpty()) {
            redis.opsForHash().delete(owner.key(), gone.stream().map(UUID::toString).toArray());
        }
        items.sort(Comparator.comparing(CartView.Item::productName).thenComparing(CartView.Item::sku));
        Money subtotal = items.stream().map(CartView.Item::lineTotal).reduce(Money.zero(shop.currency()), Money::plus);
        Money shipping = shop.shippingFor(subtotal);
        return new CartView(guestId(owner), items, items.stream().mapToInt(CartView.Item::quantity).sum(), subtotal,
                shipping, subtotal.plus(shipping), shop.freeShippingThreshold());
    }

    public CartView add(CartOwner owner, UUID variantId, int quantity) {
        int current = quantities(owner).getOrDefault(variantId, 0);
        return set(owner, variantId, Math.min(MAX_QUANTITY, current + quantity));
    }

    public CartView setQuantity(CartOwner owner, UUID variantId, int quantity) {
        if (quantity <= 0) {
            return remove(owner, variantId);
        }
        return set(owner, variantId, quantity);
    }

    public CartView remove(CartOwner owner, UUID variantId) {
        redis.opsForHash().delete(owner.key(), variantId.toString());
        return view(owner);
    }

    public void clear(CartOwner owner) {
        redis.delete(owner.key());
    }

    /** Called after an order is paid: removes what was bought, keeps anything added meanwhile. */
    public void removePurchased(CartOwner owner, Map<UUID, Integer> purchased) {
        Map<UUID, Integer> current = quantities(owner);
        purchased.forEach((variantId, quantity) -> {
            Integer inCart = current.get(variantId);
            if (inCart == null) {
                return;
            }
            if (inCart <= quantity) {
                redis.opsForHash().delete(owner.key(), variantId.toString());
            }
            else {
                redis.opsForHash().put(owner.key(), variantId.toString(), Integer.toString(inCart - quantity));
            }
        });
    }

    /** Moves a guest cart into the customer's cart after login. */
    public void merge(CartOwner.Guest guest, CartOwner.Customer customer) {
        Map<UUID, Integer> guestItems = quantities(guest);
        if (guestItems.isEmpty()) {
            redis.delete(guest.key());
            return;
        }
        Map<UUID, Integer> customerItems = quantities(customer);
        Map<UUID, StockLevel> stock = inventory.levels(guestItems.keySet());
        guestItems.forEach((variantId, quantity) -> {
            int merged = Math.min(MAX_QUANTITY, customerItems.getOrDefault(variantId, 0) + quantity);
            int capped = Math.max(1, Math.min(merged, stock.get(variantId).available()));
            redis.opsForHash().put(customer.key(), variantId.toString(), Integer.toString(capped));
        });
        redis.expire(customer.key(), TTL);
        redis.delete(guest.key());
    }

    public Map<UUID, Integer> quantities(CartOwner owner) {
        Map<Object, Object> raw = redis.opsForHash().entries(owner.key());
        Map<UUID, Integer> result = new LinkedHashMap<>();
        raw.forEach((k, v) -> {
            try {
                result.put(UUID.fromString(k.toString()), Integer.parseInt(v.toString()));
            }
            catch (IllegalArgumentException ignored) {
                // skip corrupt entries
            }
        });
        return result;
    }

    private CartView set(CartOwner owner, UUID variantId, int quantity) {
        if (quantity > MAX_QUANTITY) {
            throw ApiException.badRequest("VALIDATION_FAILED", "At most " + MAX_QUANTITY + " per item");
        }
        VariantView variant = catalog.variant(variantId).filter(VariantView::purchasable)
                .orElseThrow(() -> ApiException.notFound("Product variant"));
        int available = inventory.level(variantId).available();
        if (quantity > available) {
            throw new InsufficientStockException(
                    List.of(new InsufficientStockException.Shortage(variant.variantId(), quantity, available)));
        }
        redis.opsForHash().put(owner.key(), variantId.toString(), Integer.toString(quantity));
        redis.expire(owner.key(), TTL);
        return view(owner);
    }

    /** For visitors that have no cart yet. */
    public CartView emptyAnonymousCart() {
        return empty(null);
    }

    private CartView empty(CartOwner owner) {
        Money zero = Money.zero(shop.currency());
        return new CartView(guestId(owner), List.of(), 0, zero, zero, zero, shop.freeShippingThreshold());
    }

    private static UUID guestId(CartOwner owner) {
        return owner instanceof CartOwner.Guest guest ? guest.cartId() : null;
    }

    private Money money(long cents) {
        return Money.of(cents, shop.currency());
    }
}
