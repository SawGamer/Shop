# Z&A Shop API — v1 contract

The backend is a JSON REST API served under `/api/v1`. The storefront (Next.js) talks to it
from its server side only (BFF pattern), so browsers never see access tokens.

Interactive docs: `GET /swagger-ui.html` (OpenAPI JSON at `/v3/api-docs`).

## Conventions

| Topic | Rule |
|---|---|
| Content type | `application/json` (image uploads: `multipart/form-data`) |
| Auth | `Authorization: Bearer <accessToken>` |
| Guest cart | `X-Cart-Id: <uuid>` request header; the API echoes it back in the `X-Cart-Id` response header |
| IDs | UUID strings |
| Timestamps | ISO-8601 UTC strings, e.g. `2026-11-04T21:15:00Z` |
| Money | `Money = { "cents": 12990, "currency": "EUR" }` — integer minor units, never floats |
| Pagination | query `page` (0-based, default 0) and `pageSize` (default 24, max 100) |

### Page envelope

```json
{ "items": [], "page": 0, "pageSize": 24, "totalItems": 120, "totalPages": 5 }
```

### Errors — RFC 9457 Problem Details

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "Not enough stock for SKU NK-AIR-42-BLK",
  "instance": "/api/v1/checkout",
  "code": "INSUFFICIENT_STOCK",
  "errors": { "email": "must be a well-formed email address" },
  "items": [ { "variantId": "…", "requested": 3, "available": 1 } ]
}
```

`errors` is present only for `VALIDATION_FAILED`; `items` only for `INSUFFICIENT_STOCK`.

| code | status | meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | body/query failed validation; see `errors` |
| `EMPTY_CART` | 400 | checkout with an empty cart |
| `INVALID_CREDENTIALS` | 401 | wrong email/password |
| `INVALID_TOKEN` | 401 | bad/expired refresh or verification token |
| `UNAUTHORIZED` | 401 | missing/expired access token |
| `FORBIDDEN` | 403 | authenticated but not allowed (e.g. not admin) |
| `NOT_FOUND` | 404 | resource does not exist |
| `EMAIL_TAKEN` | 409 | registration with an existing email |
| `INSUFFICIENT_STOCK` | 409 | requested quantity exceeds available stock; see `items` |
| `INVALID_STATE_TRANSITION` | 409 | e.g. shipping an unpaid order |
| `CONFLICT` | 409 | duplicate slug/SKU, concurrent modification |
| `PAYMENT_PROVIDER_ERROR` | 502 | payment provider call failed |

## Shared types

```ts
type Money = { cents: number; currency: string }

type User = {
  id: string; email: string; firstName: string; lastName: string;
  roles: ("CUSTOMER" | "ADMIN")[]; emailVerified: boolean
}

type AuthResponse = {
  accessToken: string; accessTokenExpiresAt: string;
  refreshToken: string; refreshTokenExpiresAt: string;
  user: User
}

type Brand = { id: string; slug: string; name: string }
type CategoryRef = { id: string; slug: string; name: string }
type Category = { id: string; slug: string; name: string; parentId: string | null; children: Category[] }

type ProductImage = { id: string; url: string; alt: string | null; position: number }

type Variant = {
  id: string; sku: string; size: string | null; color: string | null;
  price: Money; compareAtPrice: Money | null;
  available: number; inStock: boolean
}

type ProductSummary = {
  id: string; slug: string; name: string; brand: Brand;
  price: Money;                 // lowest variant price
  compareAtPrice: Money | null; // compare-at of that variant, for strike-through
  imageUrl: string | null;      // first image
  inStock: boolean; sizes: string[]; colors: string[]
}

type ProductDetail = {
  id: string; slug: string; name: string; description: string;
  brand: Brand; categories: CategoryRef[]; images: ProductImage[];
  sizes: string[]; colors: string[]; variants: Variant[];
  price: Money; compareAtPrice: Money | null; inStock: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"; createdAt: string; updatedAt: string
}

type Address = {
  fullName: string; line1: string; line2: string | null;
  postalCode: string; city: string; country: string; // ISO-3166 alpha-2, e.g. "DE"
  phone: string | null
}

type CartItem = {
  variantId: string; productId: string; productSlug: string; productName: string;
  sku: string; size: string | null; color: string | null; imageUrl: string | null;
  unitPrice: Money; quantity: number; lineTotal: Money;
  available: number; inStock: boolean
}

type Cart = {
  id: string | null;            // guest cart id (null for empty anonymous / user carts)
  items: CartItem[]; itemCount: number; // itemCount = sum of quantities
  subtotal: Money; shipping: Money; total: Money;
  freeShippingThreshold: Money
}

type OrderStatus = "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED"

type OrderLine = {
  variantId: string; productSlug: string; productName: string; sku: string;
  size: string | null; color: string | null; imageUrl: string | null;
  unitPrice: Money; quantity: number; lineTotal: Money
}

type OrderSummary = {
  id: string; orderNumber: string; status: OrderStatus; total: Money;
  itemCount: number; createdAt: string; customerEmail: string
}

type Order = {
  id: string; orderNumber: string; status: OrderStatus; customerEmail: string;
  lines: OrderLine[]; subtotal: Money; shipping: Money; total: Money;
  shippingAddress: Address;
  createdAt: string; paidAt: string | null; shippedAt: string | null;
  deliveredAt: string | null; cancelledAt: string | null;
  paymentUrl: string | null     // only while PENDING_PAYMENT
}
```

## Auth — `/api/v1/auth`

| Method & path | Auth | Body | Response |
|---|---|---|---|
| `POST /auth/register` | – | `{ email, password (8–72 chars), firstName, lastName }` | `201 AuthResponse` (logged in immediately; a verification email is sent) |
| `POST /auth/login` | – | `{ email, password }` | `200 AuthResponse` |
| `POST /auth/refresh` | – | `{ refreshToken }` | `200 AuthResponse` (refresh token is rotated; the old one stops working) |
| `POST /auth/logout` | – | `{ refreshToken }` | `204` |
| `POST /auth/verify-email` | – | `{ token }` | `204` |
| `POST /auth/resend-verification` | user | – | `204` |
| `GET /me` | user | – | `200 User` |

Access tokens live 15 minutes, refresh tokens 30 days.

## Catalog — public, cacheable

| Method & path | Response |
|---|---|
| `GET /categories` | `200 Category[]` (tree: roots with nested `children`) |
| `GET /brands` | `200 Brand[]` |
| `GET /products/{slug}` | `200 ProductDetail` (only `ACTIVE` products) |
| `GET /products` | `200 SearchResponse` (see below) |

### Search — `GET /products`

Query parameters (all optional):

| param | example | notes |
|---|---|---|
| `q` | `running shoe` | full-text, typo tolerant |
| `category` | `sneakers` | category slug; includes sub-categories |
| `brand` | `brand=nike&brand=adidas` | repeatable, OR-ed |
| `size` | `size=42&size=43` | repeatable |
| `color` | `color=black` | repeatable |
| `minPrice`, `maxPrice` | `5000` | cents, inclusive |
| `inStock` | `true` | |
| `onSale` | `true` | only products with a `compareAtPrice` |
| `sort` | `relevance` \| `newest` \| `price_asc` \| `price_desc` | default `relevance` (or `newest` when no `q`) |
| `page`, `pageSize` | | |

```ts
type FacetValue = { value: string; label: string; count: number }
type SearchResponse = {
  items: ProductSummary[]; page: number; pageSize: number; totalItems: number; totalPages: number;
  facets: { brand: FacetValue[]; category: FacetValue[]; size: FacetValue[]; color: FacetValue[] }
}
```

## Cart — `/api/v1/cart`

Works for guests and users. Guests send `X-Cart-Id` (if they have one). When a request carries both a
bearer token **and** `X-Cart-Id`, the guest cart is merged into the user's cart and deleted; the
response is the user's cart (`id: null`). The storefront should then forget its guest cart id.

| Method & path | Body | Response |
|---|---|---|
| `GET /cart` | – | `200 Cart` |
| `POST /cart/items` | `{ variantId, quantity (1–99) }` — adds to existing quantity | `200 Cart` (+ `X-Cart-Id` header for new guest carts) |
| `PUT /cart/items/{variantId}` | `{ quantity (0–99) }` — 0 removes | `200 Cart` |
| `DELETE /cart/items/{variantId}` | – | `200 Cart` |
| `DELETE /cart` | – | `204` |

Adding more than is available returns `409 INSUFFICIENT_STOCK`.

Shipping: flat €4.95, free from €50.00 subtotal (configurable server side).

## Checkout & orders

| Method & path | Auth | Body | Response |
|---|---|---|---|
| `POST /checkout` | user | `{ shippingAddress: Address }` | `201 { orderId, orderNumber, paymentUrl }` |
| `GET /orders` | user | – | `200 Page<OrderSummary>` (newest first) |
| `GET /orders/{id}` | user (owner) | – | `200 Order` |

Checkout prices everything server side, reserves stock atomically (no overselling), creates the order
as `PENDING_PAYMENT` and returns the payment page URL. The browser is sent to `paymentUrl`.
After payment the provider redirects to `{STOREFRONT_URL}/checkout/success?order={orderId}`;
on cancel to `{STOREFRONT_URL}/checkout/cancelled?order={orderId}`. The order turns `PAID` only when
the provider confirms (webhook), so the success page should poll `GET /orders/{id}` until it is `PAID`.
The cart is emptied once the order is paid. Unpaid orders expire after 30 minutes and release their stock.

## Payments — `/api/v1/payments`

| Method & path | Auth | Notes |
|---|---|---|
| `POST /payments/stripe/webhook` | Stripe signature | server-to-server only |
| `POST /payments/fake/sessions/{sessionId}/complete` | user (order owner) | only when `PAYMENT_PROVIDER=fake`; `204` |
| `POST /payments/fake/sessions/{sessionId}/cancel` | user (order owner) | only when `PAYMENT_PROVIDER=fake`; `204` |

With the fake provider (default in development, no Stripe keys needed) `paymentUrl` is
`{STOREFRONT_URL}/checkout/pay/{sessionId}?order={orderId}`. The storefront renders a "test payment"
page there with **Pay** and **Cancel** buttons that call the two endpoints above and then navigate to
the success/cancelled page.

## Specifications and deals (Phase 1)

```ts
type Spec = {
  key: string;            // snake_case id derived from the label, e.g. "screen_size"
  group: string | null;   // e.g. "Display", "Performance"
  label: string;          // e.g. "Screen size"
  value: string;          // e.g. "6.4″"
  filterable: boolean     // shown as a search filter
}
type Deal = { percentOff: number; startsAt: string; endsAt: string }
```

- `ProductDetail` gains `specs: Spec[]` (in display order) and `deal: Deal | null`, which is set only
  while the deal is running.
- `AdminProduct` gains `specs: Spec[]` and `deal: Deal | null`. The admin `deal` is also set when the deal
  is scheduled or has ended.
- `ProductSummary` gains:
  - `dealEndsAt: string | null` (only while a deal is running)
  - `highlights: string[]` (up to 3 short lines, each the value followed by the label of the first filterable
    specs, e.g. "8 GB RAM", "6.4″ Screen size")
- **Pricing while a deal runs:** `price` is the discounted price and `compareAtPrice` the regular price.
  This applies everywhere: product, search, cart, checkout and orders. Deal prices are rounded to the cent.
  Search results can lag a deal's start or end by up to about 30 seconds; carts and orders are always exact.
- Spec `key` is the label in snake_case, unique per product (so a label can be used once per product).
- After upgrading an existing shop, run **Rebuild search index** once so old entries get the new fields.

Search (`GET /products`) additions:

| param | example | notes |
|---|---|---|
| `spec.<key>` | `spec.ram=8 GB&spec.ram=16 GB` | repeatable, OR within a key, AND across keys |
| `deal` | `true` | only products with a running deal |
| `sort` | `deal_ending` | running deals first, soonest ending first |

`SearchResponse.facets` gains `specs: { key: string; label: string; values: FacetValue[] }[]`. It lists the
filterable specs present in the results, and each one keeps its own counts when it is selected (disjunctive).

Admin:

| Method & path | Body | Response |
|---|---|---|
| `PUT /admin/products/{id}/specs` | `{ specs: { group?, label, value, filterable }[] }` (≤ 60, replaces all) | `200 AdminProduct` |
| `PUT /admin/products/{id}/deal` | `{ percentOff (1–90), startsAt, endsAt }` (`endsAt` after `startsAt` and in the future) | `200 AdminProduct` |
| `DELETE /admin/products/{id}/deal` | – | `200 AdminProduct` |

## Fulfillment: delivery slots and click & collect (Phase 2)

A shop runs in one of two modes, chosen in the shop settings (`fulfillmentMode`):

- `SHIPPING`: parcel delivery with the flat shipping fee. Checkout works exactly as before.
- `LOCAL`: delivery in time slots to postcodes the shop serves, or pickup in a store, plus a minimum order value.

```ts
type FulfillmentMethod = "DELIVERY" | "PICKUP"
type Zone = { id: string; name: string; postcodePrefixes: string[]; feeCents: number; freeFromCents: number | null; minOrderCents: number }
type Location = { id: string; name: string; address: Address; openingHours: string }   // Address as in the shared types
type Slot = { id: string; startsAt: string; endsAt: string; remaining: number }          // remaining > 0
type SlotDay = { date: string; slots: Slot[] }                                           // date = "2026-11-06", shop time zone
type Fulfillment = {
  method: FulfillmentMethod; slot: { startsAt: string; endsAt: string };
  zoneName: string | null; feeCents: number | null;      // DELIVERY
  locationName: string | null                            // PICKUP
}
```

- `ShopSettings` gains `fulfillmentMode: "SHIPPING" | "LOCAL"` and `timeZone` (IANA; the time zone of slots and
  opening hours).
- `Order` gains `fulfillment: Fulfillment | null` (null in `SHIPPING` mode).
- The cart is unchanged. To show "add €X more to order", the storefront compares `cart.subtotal` with the
  `minOrderCents` of the zone it got from `GET /fulfillment/zone?postcode=`; the server enforces the minimum at
  checkout.

Public endpoints (`LOCAL` mode; `409 FULFILLMENT_DISABLED` in `SHIPPING` mode):

| Method & path | Response |
|---|---|
| `GET /fulfillment/zone?postcode=10115` | `200 Zone` or `404 NOT_FOUND` when the shop does not deliver there |
| `GET /fulfillment/locations` | `200 Location[]` |
| `GET /fulfillment/slots?method=DELIVERY&postcode=10115&days=7` | `200 SlotDay[]` (bookable slots only, earliest first) |
| `GET /fulfillment/slots?method=PICKUP&locationId={id}&days=7` | `200 SlotDay[]` |

Checkout in `LOCAL` mode: `POST /checkout` body is
`{ shippingAddress, fulfillment: { method, slotId, locationId? } }` where `locationId` is required for `PICKUP`.
For `DELIVERY` the zone is derived from `shippingAddress.postalCode`. For `PICKUP` the storefront sends the
store's address (with the customer's name and phone) as `shippingAddress`; the server replaces the address with
the store's own address, and the minimum order does not apply. `slotId` is an opaque id taken from the slots
endpoint, and slots can only be booked while they are listed there.

- The slot is booked atomically together with the stock reservation; if it filled up meanwhile:
  `409 SLOT_UNAVAILABLE`. A postcode outside every zone: `400 NOT_DELIVERABLE` (`errors.postalCode`).
  A cart below the zone's minimum: `400 BELOW_MINIMUM_ORDER` with `minOrder` and `subtotal` as `Money`.
- The delivery fee replaces the flat shipping fee (free from `freeFromCents`); pickup is free.
- A cancelled or expired order releases its slot.

Reorder: `POST /orders/{id}/reorder` (customer, owner) adds the items of a past order to the cart where they are
still sold and in stock, and returns `200 { cart: Cart, added: number, skipped: { productName, reason }[] }`
(`reason`: `UNAVAILABLE` or `OUT_OF_STOCK`; quantities are capped to the available stock).

Admin (role `ADMIN`):

| Method & path | Body | Response |
|---|---|---|
| `GET /admin/fulfillment` | – | `200 { mode, timeZone, zones: Zone[], locations: Location[], schedule: Schedule }` |
| `PUT /admin/fulfillment/mode` | `{ mode }` | `200 { mode }` |
| `POST /admin/fulfillment/zones` / `PUT /admin/fulfillment/zones/{id}` | `{ name, postcodePrefixes (1–50, digits/letters), feeCents, freeFromCents?, minOrderCents }` | `200/201 Zone` |
| `DELETE /admin/fulfillment/zones/{id}` | – | `204` |
| `POST /admin/fulfillment/locations` / `PUT …/{id}` | `{ name, address, openingHours }` | `200/201 Location` |
| `DELETE /admin/fulfillment/locations/{id}` | – | `204` |
| `PUT /admin/fulfillment/schedule` | `Schedule` (below) | `200 Schedule` |

```ts
type Schedule = {
  slotMinutes: number;        // 30–240
  capacityPerSlot: number;    // orders per slot, 1–500
  leadTimeMinutes: number;    // earliest booking from now
  horizonDays: number;        // 1–14
  openingHours: { dayOfWeek: 1|2|3|4|5|6|7; from: "08:00"; to: "20:00" }[]   // ISO weekday, shop time zone
}
```

## Customer accounts and content pages (Phase 3)

### Password reset

| Method & path | Auth | Body | Response |
|---|---|---|---|
| `POST /auth/forgot-password` | – | `{ email }` | `204` always, whether or not the email exists (no account enumeration) |
| `POST /auth/reset-password` | – | `{ token, password (8–72 chars) }` | `204`; `401 INVALID_TOKEN` when the token is wrong, used or older than 1 hour |

The email contains `{STOREFRONT_URL}/reset-password?token=…`. At most one reset email is sent per account per
minute. A successful reset signs the account out everywhere (all refresh tokens are revoked), marks the email as
verified, and invalidates every other open reset link.

### Saved addresses

```ts
type SavedAddress = Address & { id: string; label: string | null; isDefault: boolean }  // Address as in the shared types
type SavedAddressInput = Address & { label?: string | null; isDefault?: boolean }
```

| Method & path | Body | Response |
|---|---|---|
| `GET /me/addresses` | – | `200 SavedAddress[]` (default first, then newest) |
| `POST /me/addresses` | `SavedAddressInput` | `201 SavedAddress`; `409 ADDRESS_LIMIT` beyond 10 addresses |
| `PUT /me/addresses/{id}` | `SavedAddressInput` | `200 SavedAddress` |
| `DELETE /me/addresses/{id}` | – | `204` |

The first address becomes the default automatically. Marking one as default unsets the previous default;
deleting the default promotes the newest remaining address. Other customers' addresses answer `404`.

### Deleting the account

`DELETE /me` with `{ password }` → `204`. `401 INVALID_CREDENTIALS` for a wrong password; `403 FORBIDDEN` for admin
accounts. Personal data is erased: name, email (replaced by a placeholder), saved addresses, tokens and the cart.
Orders are kept (tax retention) and keep the email address used at the time, but can no longer be reached by a login.

### Content pages (imprint, terms, privacy, returns)

```ts
type PageSlug = "imprint" | "terms" | "privacy" | "returns"
type PageSummary = { slug: PageSlug; title: string; isTemplate: boolean }
type ContentPage = PageSummary & { body: string; updatedAt: string | null }
```

`body` is plain text: paragraphs are separated by a blank line and a line starting with `## ` is a heading. No HTML.
Until the shop owner saves a page it holds a starter template and `isTemplate` is `true`.

| Method & path | Auth | Body | Response |
|---|---|---|---|
| `GET /pages` | – (cacheable 60 s) | – | `200 PageSummary[]` |
| `GET /pages/{slug}` | – (cacheable 60 s) | – | `200 ContentPage` |
| `PUT /admin/pages/{slug}` | admin | `{ title (1–120), body (≤ 50 000) }` | `200 ContentPage` (`isTemplate` becomes `false`) |

## Shop settings and design

One row of settings describes the shop: its name and the storefront design. The backend only stores and
validates them; how a design looks is entirely up to the storefront.

```ts
type ThemeId = "footwear" | "electronics" | "grocery" | "home" | "beauty" | "sports" | "books" | "gourmet"
type ShopSettings = {
  name: string;               // e.g. "Z&A"
  tagline: string | null;     // short line for the hero/footer
  theme: ThemeId;
  accentColor: string | null; // "#RRGGBB" overriding the design's accent colour, or null
  logoUrl: string | null;     // transparent PNG, ≤ 512 px
  currency: string;           // ISO-4217, e.g. "EUR"
  updatedAt: string
}
```

| Method & path | Auth | Body | Response |
|---|---|---|---|
| `GET /shop` | – (cacheable 30 s) | – | `200 ShopSettings` |
| `PUT /admin/shop` | admin | `{ name (1–80), tagline (≤ 160, nullable), theme, accentColor (nullable, ^#[0-9a-fA-F]{6}$) }` | `200 ShopSettings` |
| `POST /admin/shop/logo` | admin | multipart `file` (PNG/JPEG/GIF ≤ 2 MB) | `200 ShopSettings` |
| `DELETE /admin/shop/logo` | admin | – | `200 ShopSettings` |

The initial theme matches the seeded demo catalog (see docs/demo-catalogs.md, which also lists how each
design labels the variant `size` and `color` fields).

## Admin — `/api/v1/admin` (role `ADMIN`)

```ts
type AdminVariant = Variant & { onHand: number; reserved: number }
type AdminProduct = Omit<ProductDetail, "variants"> & { variants: AdminVariant[] }
type AdminProductSummary = {
  id: string; slug: string; name: string; brand: Brand; status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  price: Money | null; totalAvailable: number; variantCount: number; imageUrl: string | null; updatedAt: string
}
type ProductUpsert = {
  name: string; slug?: string; description: string; brandId: string;
  categoryIds: string[]; status: "DRAFT" | "ACTIVE" | "ARCHIVED"
}
type VariantUpsert = {
  sku: string; size: string | null; color: string | null;
  priceCents: number; compareAtPriceCents: number | null;
  onHand?: number            // only used on create
}
type Dashboard = {
  revenue: { today: Money; last7Days: Money; last30Days: Money };
  orders: { today: number; last7Days: number; last30Days: number; pendingPayment: number; toShip: number };
  lowStock: { variantId: string; productId: string; productName: string; sku: string;
              size: string | null; color: string | null; available: number }[];
  recentOrders: OrderSummary[]
}
```

| Method & path | Body | Response |
|---|---|---|
| `GET /admin/dashboard` | – | `200 Dashboard` |
| `GET /admin/products?q=&status=&page=&pageSize=` | – | `200 Page<AdminProductSummary>` |
| `POST /admin/products` | `ProductUpsert` | `201 AdminProduct` |
| `GET /admin/products/{id}` | – | `200 AdminProduct` |
| `PUT /admin/products/{id}` | `ProductUpsert` | `200 AdminProduct` |
| `DELETE /admin/products/{id}` | – | `204` (archives the product) |
| `POST /admin/products/{id}/variants` | `VariantUpsert` | `201 AdminProduct` |
| `PUT /admin/products/{id}/variants/{variantId}` | `VariantUpsert` | `200 AdminProduct` |
| `DELETE /admin/products/{id}/variants/{variantId}` | – | `200 AdminProduct` |
| `PUT /admin/inventory/{variantId}` | `{ onHand }` | `200 { variantId, onHand, reserved, available }` |
| `POST /admin/products/{id}/images` | multipart: `file` (JPEG/PNG/GIF ≤ 10 MB; stored as JPEG ≤ 1600 px), optional `alt` | `201 AdminProduct` |
| `DELETE /admin/products/{id}/images/{imageId}` | – | `200 AdminProduct` |
| `GET /admin/categories` | – | `200 Category[]` (flat, `children` empty) |
| `POST /admin/categories` | `{ name, slug?, parentId? }` | `201 Category` |
| `PUT /admin/categories/{id}` | `{ name, slug?, parentId? }` | `200 Category` |
| `DELETE /admin/categories/{id}` | – | `204` |
| `POST /admin/brands` | `{ name, slug? }` | `201 Brand` |
| `PUT /admin/brands/{id}` | `{ name, slug? }` | `200 Brand` |
| `DELETE /admin/brands/{id}` | – | `204` (`409 CONFLICT` if products use it) |
| `GET /admin/orders?status=&q=&page=&pageSize=` | – | `200 Page<OrderSummary>` (`q` matches order number or email) |
| `GET /admin/orders/{id}` | – | `200 Order` |
| `POST /admin/orders/{id}/status` | `{ status: "SHIPPED" \| "DELIVERED" \| "CANCELLED" }` | `200 Order` |
| `POST /admin/search/reindex` | – | `202 { indexed: number }` |

Allowed order transitions: `PENDING_PAYMENT → CANCELLED`, `PAID → SHIPPED → DELIVERED`.

## Operations

| Path | Purpose |
|---|---|
| `GET /actuator/health/liveness`, `/actuator/health/readiness` | container probes |
| `GET /actuator/prometheus` | metrics |
