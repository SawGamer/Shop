import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Totals } from "@/components/cart-summary";
import { CheckoutForm } from "@/components/checkout-form";
import { Container, PageTitle, ProductImage, ServiceDown } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCartSafe } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const cart = await getCartSafe();
  if (!cart) {
    return (
      <Container className="py-10">
        <PageTitle>Checkout</PageTitle>
        <ServiceDown what="checkout" />
      </Container>
    );
  }
  if (cart.items.length === 0) redirect("/cart");

  const itemNames = Object.fromEntries(
    cart.items.map((i) => [i.variantId, [i.productName, i.size && `size ${i.size}`].filter(Boolean).join(", ")]),
  );

  return (
    <Container className="py-10">
      <PageTitle sub={`Signed in as ${user.email}`}>Checkout</PageTitle>
      <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="max-w-xl">
          <CheckoutForm defaultName={`${user.firstName} ${user.lastName}`.trim()} itemNames={itemNames} />
        </div>
        <aside aria-label="Order summary" className="h-fit rounded-tag bg-white p-5">
          <h2 className="headline text-xl">Your order</h2>
          <ul className="mt-4 space-y-4">
            {cart.items.map((i) => (
              <li key={i.variantId} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-sm">
                <div className="aspect-square overflow-hidden rounded-tag bg-cloud">
                  <ProductImage src={i.imageUrl} alt={i.productName} name={i.productName} sizes="sm" />
                </div>
                <div>
                  <p className="font-semibold">{i.productName}</p>
                  <p className="text-ink-soft">
                    {[i.size && `Size ${i.size}`, i.color, `Qty ${i.quantity}`].filter(Boolean).join(", ")}
                  </p>
                </div>
                <p className="tabular">{formatMoney(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-mist pt-4">
            <Totals cart={cart} />
          </div>
        </aside>
      </div>
    </Container>
  );
}
