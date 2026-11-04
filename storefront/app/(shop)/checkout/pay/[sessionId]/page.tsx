import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TestPaymentButtons } from "@/components/test-payment";
import { Container, Notice, OrderStatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getOrder } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Test payment", robots: { index: false } };

type Props = { params: Promise<{ sessionId: string }>; searchParams: Promise<{ order?: string }> };

export default async function TestPaymentPage({ params, searchParams }: Props) {
  const { sessionId } = await params;
  const { order: orderId } = await searchParams;
  await requireUser(`/checkout/pay/${sessionId}${orderId ? `?order=${orderId}` : ""}`);
  if (!orderId) notFound();
  const order = await getOrder(orderId);
  if (!order) notFound();

  return (
    <Container className="max-w-lg py-12">
      <div className="rounded-tag border-2 border-ink bg-white">
        <div className="border-b-2 border-ink px-5 py-4">
          <p className="text-sm font-semibold text-ink-soft">Order {order.orderNumber}</p>
          <h1 className="headline mt-1 text-3xl">Test payment</h1>
        </div>
        <div className="space-y-5 px-5 py-5">
          <Notice tone="warning" title="No card is charged">
            This shop is running with the test payment provider. Choose Pay to simulate a successful payment, or
            Cancel to simulate an abandoned one.
          </Notice>
          <dl className="tabular space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Items</dt>
              <dd>{order.lines.reduce((n, l) => n + l.quantity, 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Shipping</dt>
              <dd>{order.shipping.cents === 0 ? "Free" : formatMoney(order.shipping)}</dd>
            </div>
            <div className="flex justify-between pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatMoney(order.total)}</dd>
            </div>
          </dl>
          {order.status === "PENDING_PAYMENT" ? (
            <TestPaymentButtons sessionId={sessionId} orderId={order.id} totalLabel={formatMoney(order.total)} />
          ) : (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm">
                This order is <OrderStatusBadge status={order.status} />
              </p>
              <Link href={`/account/orders/${order.id}`} className="btn btn-ink w-full">
                View order
              </Link>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
