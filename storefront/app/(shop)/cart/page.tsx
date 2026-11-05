import type { Metadata } from "next";
import Link from "next/link";
import { CartLine } from "@/components/cart-line";
import { FreeShippingMeter, Totals } from "@/components/cart-summary";
import { Container, EmptyState, PageTitle, ServiceDown } from "@/components/ui";
import { clearCart } from "@/lib/actions/cart";
import { getCartSafe } from "@/lib/data";
import { pluralize } from "@/lib/format";
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

  const blocked = cart.items.some((i) => i.quantity > i.available);

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
          <FreeShippingMeter cart={cart} />
          <Totals cart={cart} />
          {blocked ? (
            <p className="text-sm text-signal">Lower the quantities marked in red to check out.</p>
          ) : null}
          <Link
            href="/checkout"
            aria-disabled={blocked}
            className={blocked ? "btn btn-primary pointer-events-none w-full opacity-55" : "btn btn-primary w-full"}
          >
            Check out
          </Link>
          <Link href="/search" className="block text-center text-sm font-semibold text-cobalt hover:underline">
            Keep shopping
          </Link>
        </aside>
      </div>
    </Container>
  );
}
