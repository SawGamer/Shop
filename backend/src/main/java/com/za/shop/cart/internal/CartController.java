package com.za.shop.cart.internal;

import java.util.Optional;
import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.za.shop.cart.CartOwner;
import com.za.shop.cart.CartService;
import com.za.shop.cart.CartView;
import com.za.shop.shared.CurrentUser;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Guests are identified by the {@code X-Cart-Id} header. When a logged-in request still carries a
 * guest cart id, the guest cart is merged into the customer's cart first.
 */
@RestController
@RequestMapping("/api/v1/cart")
@Tag(name = "Cart")
class CartController {

    static final String CART_HEADER = "X-Cart-Id";

    record AddItemRequest(@NotNull UUID variantId, @NotNull @Min(1) @Max(CartService.MAX_QUANTITY) Integer quantity) {
    }

    record UpdateItemRequest(@NotNull @Min(0) @Max(CartService.MAX_QUANTITY) Integer quantity) {
    }

    private final CartService carts;

    CartController(CartService carts) {
        this.carts = carts;
    }

    @GetMapping
    ResponseEntity<CartView> get(@RequestHeader(value = CART_HEADER, required = false) String cartId) {
        return respond(resolve(cartId, false).map(carts::view).orElseGet(carts::emptyAnonymousCart));
    }

    @PostMapping("/items")
    ResponseEntity<CartView> add(@RequestHeader(value = CART_HEADER, required = false) String cartId,
            @Valid @RequestBody AddItemRequest request) {
        CartOwner owner = resolve(cartId, true).orElseThrow();
        return respond(carts.add(owner, request.variantId(), request.quantity()));
    }

    @PutMapping("/items/{variantId}")
    ResponseEntity<CartView> update(@RequestHeader(value = CART_HEADER, required = false) String cartId,
            @PathVariable UUID variantId, @Valid @RequestBody UpdateItemRequest request) {
        CartOwner owner = resolve(cartId, true).orElseThrow();
        return respond(carts.setQuantity(owner, variantId, request.quantity()));
    }

    @DeleteMapping("/items/{variantId}")
    ResponseEntity<CartView> remove(@RequestHeader(value = CART_HEADER, required = false) String cartId,
            @PathVariable UUID variantId) {
        CartOwner owner = resolve(cartId, true).orElseThrow();
        return respond(carts.remove(owner, variantId));
    }

    @DeleteMapping
    ResponseEntity<Void> clear(@RequestHeader(value = CART_HEADER, required = false) String cartId) {
        resolve(cartId, false).ifPresent(carts::clear);
        return ResponseEntity.noContent().build();
    }

    /**
     * @param create whether to start a new guest cart when the visitor has none yet
     */
    private Optional<CartOwner> resolve(String cartIdHeader, boolean create) {
        Optional<UUID> guestId = parse(cartIdHeader);
        Optional<CurrentUser.AuthenticatedUser> user = CurrentUser.find();
        if (user.isPresent()) {
            CartOwner.Customer customer = new CartOwner.Customer(user.get().id());
            guestId.ifPresent(id -> carts.merge(new CartOwner.Guest(id), customer));
            return Optional.of(customer);
        }
        if (guestId.isPresent()) {
            return Optional.of(new CartOwner.Guest(guestId.get()));
        }
        return create ? Optional.of(new CartOwner.Guest(UUID.randomUUID())) : Optional.empty();
    }

    private static ResponseEntity<CartView> respond(CartView cart) {
        var response = ResponseEntity.ok().cacheControl(CacheControl.noStore());
        if (cart.id() != null) {
            response.header(CART_HEADER, cart.id().toString());
        }
        return response.body(cart);
    }

    private static Optional<UUID> parse(String header) {
        if (header == null || header.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(header.trim()));
        }
        catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
