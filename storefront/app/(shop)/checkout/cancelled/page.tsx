import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getOrder } from "@/lib/data";

export const metadata: Metadata = { title: "Payment cancelled", robots: { index: false } };

type Props = { searchParams: Promise<{ order?: string }> };

export default async function CheckoutCancelledPage({ searchParams }: Props) {
  const { order: orderId } = await searchParams;
  await requireUser(`/checkout/cancelled${orderId ? `?order=${orderId}` : ""}`);
  const order = orderId ? await getOrder(orderId).catch(() => null) : null;
  const canRetry = order?.status === "PENDING_PAYMENT" && !!order.paymentUrl;

  return (
    <Container className="max-w-2xl py-16">
      <h1 className="headline text-4xl">Payment cancelled</h1>
      <p className="mt-3 text-ink-soft">
        {order ? `Order ${order.orderNumber} hasn't been paid. ` : "Your order hasn't been paid. "}
        Nothing was charged. Your cart still has your items, and unpaid orders release their stock after 30 minutes.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        {canRetry && (
          <a href={order!.paymentUrl!} className="btn btn-primary">
            Try the payment again
          </a>
        )}
        <Link href="/cart" className={canRetry ? "btn btn-quiet" : "btn btn-primary"}>
          Back to your cart
        </Link>
      </div>
    </Container>
  );
}
