import type { Metadata } from "next";
import Link from "next/link";
import { CartLine } from "@/components/cart-line";
import { FreeDeliveryMeter, FreeShippingMeter, LocalTotals, MinimumOrderMeter, Totals } from "@/components/cart-summary";
import { PostcodeControl } from "@/components/postcode-control";
import { Container, EmptyState, Notice, PageTitle, ServiceDown } from "@/components/ui";
import { clearCart } from "@/lib/actions/cart";
import { getCartSafe } from "@/lib/data";
import { pluralize } from "@/lib/format";
import { getFulfillmentConfig, getPostcodeCookie, getZone } from "@/lib/fulfillment-data";
import { centsToMinimum } from "@/lib/fulfillment";
import { formatMoney } from "@/lib/money";
import { getShop } from "@/lib/shop";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const cart = await getCartSafe();

  if (!cart) {
    return (
      <Container className="py-10">
        <PageTitle>Your cart</PageTitle>
        <ServiceDown what="your cart" />
      </Container>
    );
  }

  if (cart.items.length === 0) {
    const { theme } = await getShop();
    return (
      <Container className="py-10">
        <PageTitle>Your cart</PageTitle>
        <EmptyState title={theme.copy.emptyCart} action={{ href: "/search", label: `Browse ${theme.labels.allProducts.replace(/^All /, "").toLowerCase()}` }}>
          {theme.copy.emptyCartHint}
        </EmptyState>
      </Container>
    );
  }

  const blockedByStock = cart.items.some((i) => i.quantity > i.available);

  // LOCAL fulfillment mode: delivery fee, minimum order and free delivery depend on the postcode's zone.
  const { mode } = await getFulfillmentConfig();
  const local = mode === "LOCAL";
  const postcode = local ? await getPostcodeCookie() : null;
  const zone = postcode ? await getZone(postcode).catch(() => null) : null;
  const { settings } = await getShop();
  const missing = zone ? centsToMinimum(cart.subtotal.cents, zone) : 0;
  const belowMinimum = missing > 0 && zone !== null;
  const blocked = blockedByStock || belowMinimum;

  return (
    <Container className="py-10">
      <PageTitle sub={pluralize(cart.itemCount, "item")}>Your cart</PageTitle>
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Items">
          <ul className="border-t border-mist">
            {cart.items.map((item) => (
              <CartLine key={item.variantId} item={item} />
            ))}
          </ul>
          <form action={clearCart} className="mt-4">
            <button type="submit" className="text-sm font-semibold text-ink-soft hover:underline">
              Empty the cart
            </button>
          </form>
        </section>

        <aside aria-label="Order summary" className="h-fit space-y-6 rounded-tag bg-white p-5 lg:sticky lg:top-6">
          {local ? (
            <>
              {zone ? (
                <>
                  <MinimumOrderMeter cart={cart} zone={zone} />
                  <FreeDeliveryMeter cart={cart} zone={zone} />
                </>
              ) : (
                <>
                  {postcode && (
                    <Notice tone="warning" title={`We don't deliver to ${postcode} yet`}>
                      You can still pick up your order in a store.
                    </Notice>
                  )}
                  <PostcodeControl postcode={postcode} zone={zone} currency={settings.currency} variant="inline" />
                </>
              )}
              <LocalTotals cart={cart} zone={zone} />
            </>
          ) : (
            <>
              <FreeShippingMeter cart={cart} />
              <Totals cart={cart} />
            </>
          )}
          {blockedByStock ? (
            <p className="text-sm text-signal">Lower the quantities marked in red to check out.</p>
          ) : belowMinimum && zone ? (
            <p className="text-sm text-signal" role="status">
              Delivery needs a minimum order of {formatMoney({ cents: zone.minOrderCents, currency: cart.subtotal.currency })}.
              Add {formatMoney({ cents: missing, currency: cart.subtotal.currency })} more to check out.
            </p>
          ) : null}
          <Link
            href="/checkout"
            aria-disabled={blocked}
            className={blocked ? "btn btn-primary pointer-events-none w-full opacity-55" : "btn btn-primary w-full"}
          >
            Check out
          </Link>
          {local && belowMinimum && !blockedByStock && (
            <Link href="/checkout?method=pickup" className="block text-center text-sm font-semibold text-cobalt hover:underline">
              Or pick up in a store (no minimum)
            </Link>
          )}
          <Link href="/search" className="block text-center text-sm font-semibold text-cobalt hover:underline">
            Keep shopping
          </Link>
        </aside>
      </div>
    </Container>
  );
}
