import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FulfillmentBlock, addressHeading } from "@/components/order-fulfillment";
import { OrderAddress, OrderLines, OrderTimeline, OrderTotals } from "@/components/order-lines";
import { ReorderButton } from "@/components/reorder-button";
import { Container, OrderStatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getOrder } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { getFulfillmentConfig } from "@/lib/fulfillment-data";

export const metadata: Metadata = { title: "Order" };

type Props = { params: Promise<{ id: string }> };

export default async function OrderPage({ params }: Props) {
  const { id } = await params;
  await requireUser(`/account/orders/${id}`);
  const order = await getOrder(id);
  if (!order) notFound();
  const { mode, timeZone } = await getFulfillmentConfig();

  return (
    <Container className="py-10">
      <Link href="/account" className="text-sm font-semibold text-cobalt hover:underline">
        All orders
      </Link>
      <div className="mt-3 mb-8 flex flex-wrap items-center gap-3">
        <h1 className="headline tabular text-3xl sm:text-4xl">Order {order.orderNumber}</h1>
        <OrderStatusBadge status={order.status} />
        {mode === "LOCAL" && <ReorderButton orderId={order.id} className="sm:ml-auto" />}
      </div>

      {order.status === "PENDING_PAYMENT" && order.paymentUrl && (
        <div className="mb-8 flex flex-wrap items-center gap-4 rounded-tag bg-sticker/40 p-4">
          <p className="text-sm">This order isn&apos;t paid yet. Unpaid orders are cancelled after 30 minutes.</p>
          <a href={order.paymentUrl} className="btn btn-primary btn-sm">
            Pay now
          </a>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <OrderTimeline order={order} />
          <OrderLines order={order} />
        </div>
        <aside className="h-fit space-y-6 rounded-tag bg-white p-5">
          <FulfillmentBlock order={order} timeZone={timeZone} />
          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink-soft">{addressHeading(order)}</h2>
            <OrderAddress order={order} />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink-soft">Payment</h2>
            <OrderTotals order={order} />
          </div>
          <p className="text-xs text-ink-faint">Placed {formatDateTime(order.createdAt)}</p>
        </aside>
      </div>
    </Container>
  );
}
