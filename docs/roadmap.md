# Roadmap

Goal: grow Z&A from a single-shop storefront into a platform that runs big-retailer style shops in different
genres (electronics like MediaMarkt, groceries like REWE, and the other designs). It should feel like a
large store, without copying any retailer's brand or layout.

Principles:
- **One owner per shop in version 1.** The shop owner (admin) adds and manages all products. Other sellers
  come in version 2.
- **Keep genres separate.** Each deployment is one shop with one genre design (`footwear`, `electronics`,
  `grocery`, `home`, `beauty`).
- **Genre features are switched on per shop**, not hard-wired to a design. A home shop could use click &
  collect, for example.
- **Every phase ships on its own** with tests, docs and a working demo.

## Done (current PR)

- The headless platform: Spring Boot API, Next.js storefront, admin, Stripe, search, carts, orders, CI and Docker.
- Five genre designs, an admin Design page and a demo catalog per genre.

## Phase 1 — Big electronics store tools (done)

| Feature | What the customer gets | Backend | Storefront |
|---|---|---|---|
| Specifications | spec table on the product page ("Display 6.4″", "RAM 8 GB") | `product_specs` table, specs in product API and search index | grouped spec table; specs editor in admin |
| Spec filters | filter by RAM, screen size, storage… in search | filterable specs become search facets (`spec.<key>=value`) | extra facet groups in the filter sidebar |
| Compare | compare up to 4 products side by side | none (uses specs) | "Compare" toggle on cards, sticky compare bar, `/compare` page highlighting differences |
| Deals of the day | time-limited discounts with a live countdown | `product_deals` (percent off, start, end); deal price applied in cart and checkout; search refreshed when deals start and end | deals section with countdowns; deal badge; deal editor in admin |
| Mega-menu | browse all departments from the header | none (uses the category tree) | multi-column department menu on desktop, drill-down on mobile |

Demo: specs for all 12 electronics products and 3 running deals. Verified in a browser against the real API and covered by backend integration tests.

## Phase 2 — Grocery delivery and pickup (done)

| Feature | What the customer gets | Backend | Storefront |
|---|---|---|---|
| Delivery area | "Do you deliver to 10115?" check | delivery zones (postcode prefixes, fee) | postcode check in the header and at checkout |
| Delivery slots | choose a 1–2 hour delivery window | slot schedule (opening hours, slot length, capacity, lead time) and atomic slot booking at checkout, released when the order is cancelled | slot picker by day at checkout; slot shown on the order |
| Click & collect | pick up at a store | pickup locations (address, hours) with the same slots | "Delivery / Pickup" choice at checkout, store picker |
| Minimum order | clear message when the cart is below the minimum | minimum order value, enforced at checkout | progress bar in the cart |
| Reorder | buy a previous order again in one click | `POST /orders/{id}/reorder` adds available items to the cart | "Buy again" button on past orders |
| Admin | manage all of the above | admin endpoints | fulfillment settings page (mode, hours, slots, zones, stores) |

The fulfillment mode is a shop setting: `SHIPPING` (parcel delivery, today's behaviour) or `LOCAL`
(delivery slots and pickup). Grocery demo: two delivery zones, two pickup stores, 1-hour slots. Verified in a browser against the real API and covered by backend integration tests.

## Phase 3 — Hardening for launch

**Done so far:** password reset, saved addresses, account deletion, and editable legal pages (see below).
**Still open:** invoices with VAT, refunds, payment tests with real Stripe keys, load test, monitoring and backups.
These need input from the shop owner (VAT rate and company details, Stripe keys, a target environment).


- **Customer accounts:** saved addresses, password reset, delete my account.
- **Legal (Germany/EU):** imprint, terms and privacy pages; cookie consent; prices shown incl. VAT; invoices as PDF.
- **Payments:** test against real Stripe, add refunds and partial refunds from admin, PayPal through Stripe.
- **Operations:** load test (target several hundred orders per minute), CDN for images, backups, error
  monitoring, uptime alerts.
- **Content:** replace the demo images with real product photos.

## Version 2 — Marketplace with sellers

The architecture is already prepared: modules have clear boundaries and no cross-module foreign keys.

- **Sellers:** sellers apply and are approved by the shop owner, then get their own **seller admin** with
  products, stock and orders limited to their items.
- **Data:** a `seller_id` on products, variants and order lines; seller shop pages ("Sold by …").
- **Orders and payouts:** one customer order is split into per-seller fulfilment. Payouts go through Stripe
  Connect, with a commission per category for the platform.
- **Trust:** reviews and ratings for products and sellers, plus a reporting and moderation queue.

## Suggested order and effort

| Step | Rough effort |
|---|---|
| Phase 1: electronics tools | 1 session |
| Phase 2: grocery delivery and pickup | 1–2 sessions |
| Phase 3: hardening for launch | 2–3 sessions, plus your input on legal texts and real Stripe keys |
| Version 2: marketplace | several sessions; starts with a design review of seller onboarding and payouts |
