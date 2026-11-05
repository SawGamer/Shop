import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Totals } from "@/components/cart-summary";
import { CheckoutProvider, LocalCheckoutTotals } from "@/components/checkout-context";
import { CheckoutForm } from "@/components/checkout-form";
import { LocalCheckoutForm } from "@/components/local-checkout-form";
import { Container, PageTitle, ProductImage, ServiceDown } from "@/components/ui";
import { getMyAddressesSafe } from "@/lib/addresses-data";
import { requireUser } from "@/lib/auth";
import { getCartSafe } from "@/lib/data";
import { getFulfillmentConfig, getLocations, getPostcodeCookie, getZone } from "@/lib/fulfillment-data";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Checkout" };

type Props = { searchParams: Promise<{ method?: string }> };

export default async function CheckoutPage({ searchParams }: Props) {
  const user = await requireUser("/checkout");
  const { method: methodParam } = await searchParams;
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

  const { mode, timeZone } = await getFulfillmentConfig();
  const local = mode === "LOCAL";
  const postcode = local ? await getPostcodeCookie() : null;
  const [zone, locations] = local
    ? await Promise.all([postcode ? getZone(postcode) : Promise.resolve(null), getLocations()])
    : [null, []];
  const defaultName = `${user.firstName} ${user.lastName}`.trim();
  const addresses = await getMyAddressesSafe();

  const page = (
    <Container className="py-10">
      <PageTitle sub={`Signed in as ${user.email}`}>Checkout</PageTitle>
      <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="max-w-xl">
          {local ? (
            <LocalCheckoutForm
              defaultName={defaultName}
              itemNames={itemNames}
              locations={locations}
              timeZone={timeZone}
              initialPostcode={postcode}
              addresses={addresses}
            />
          ) : (
            <CheckoutForm defaultName={defaultName} itemNames={itemNames} addresses={addresses} />
          )}
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
          <div className="mt-5 border-t border-mist pt-4">{local ? <LocalCheckoutTotals /> : <Totals cart={cart} />}</div>
        </aside>
      </div>
    </Container>
  );

  if (!local) return page;
  return (
    <CheckoutProvider
      initialMethod={methodParam === "pickup" && locations.length > 0 ? "PICKUP" : "DELIVERY"}
      initialZone={zone}
      subtotalCents={cart.subtotal.cents}
      currency={cart.subtotal.currency}
    >
      {page}
    </CheckoutProvider>
  );
}
