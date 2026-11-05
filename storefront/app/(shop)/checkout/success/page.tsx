import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FulfillmentBlock } from "@/components/order-fulfillment";
import { OrderStatusPoller, RefreshSoon } from "@/components/order-status-poller";
import { Container, Notice } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getOrder } from "@/lib/data";
import { getFulfillmentConfig } from "@/lib/fulfillment-data";
import { formatMoney } from "@/lib/money";
import { describeSize } from "@/lib/colors";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

type Props = { searchParams: Promise<{ order?: string }> };

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order: orderId } = await searchParams;
  const user = await requireUser(`/checkout/success${orderId ? `?order=${orderId}` : ""}`);
  if (!orderId) notFound();
  const order = await getOrder(orderId);
  if (!order) notFound();
  const { timeZone } = await getFulfillmentConfig();

  if (order.status === "PENDING_PAYMENT") {
    return (
      <Container className="max-w-2xl py-16">
        <h1 className="headline text-4xl">Almost done</h1>
        <p className="mt-3 text-ink-soft">Order {order.orderNumber} is placed. We&apos;re waiting for the payment provider.</p>
        <div className="mt-8">
          <OrderStatusPoller orderId={order.id} />
        </div>
      </Container>
    );
  }

  if (order.status === "CANCELLED") {
    return (
      <Container className="max-w-2xl py-16">
        <h1 className="headline text-4xl">This order was cancelled</h1>
        <p className="mt-3 text-ink-soft">
          Order {order.orderNumber} wasn&apos;t paid in time, so we released the items. Your cart is still there if you
          want to try again.
        </p>
        <Link href="/cart" className="btn btn-primary mt-8">
          Go to your cart
        </Link>
      </Container>
    );
  }

  return (
    <Container className="max-w-2xl py-16">
      <RefreshSoon />
      <h1 className="headline text-[3.2rem] leading-[0.95] sm:text-[4.5rem]">Thanks, {user.firstName}. It&apos;s paid.</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Order <strong className="text-ink">{order.orderNumber}</strong> is confirmed. Shipping updates go to{" "}
        {order.customerEmail}.
      </p>
      {order.fulfillment && (
        <div className="mt-6 rounded-tag bg-white p-5">
          <FulfillmentBlock order={order} timeZone={timeZone} />
        </div>
      )}
      <div className="mt-8 rounded-tag bg-white p-5">
        <ul className="space-y-2 text-sm">
          {order.lines.map((l) => (
            <li key={l.variantId} className="tabular flex justify-between gap-4">
              <span>
                {l.quantity} × {l.productName}
                {l.size ? `, ${describeSize(l.size)}` : ""}
              </span>
              <span>{formatMoney(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <p className="tabular mt-4 flex justify-between border-t border-mist pt-3 font-bold">
          <span>Total paid</span>
          <span>{formatMoney(order.total)}</span>
        </p>
      </div>
      {!user.emailVerified && (
        <Notice tone="info" className="mt-6" title="Confirm your email address">
          Use the link we emailed you so shipping updates reach you.
        </Notice>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/account/orders/${order.id}`} className="btn btn-ink">
          Track this order
        </Link>
        <Link href="/search" className="btn btn-quiet">
          Keep shopping
        </Link>
      </div>
    </Container>
  );
}
