import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTitle, Panel } from "@/components/admin/bits";
import { ActionForm, SubmitButton } from "@/components/forms";
import { OrderAddress, OrderLines, OrderTimeline, OrderTotals } from "@/components/order-lines";
import { OrderStatusBadge } from "@/components/ui";
import { setOrderStatus } from "@/lib/actions/admin";
import { getAdminOrder } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Order" };

type Props = { params: Promise<{ id: string }> };

/** The transitions the API allows from each status. */
const NEXT: Partial<Record<OrderStatus, { to: "SHIPPED" | "DELIVERED" | "CANCELLED"; label: string; danger?: boolean; confirm?: string }[]>> = {
  PENDING_PAYMENT: [{ to: "CANCELLED", label: "Cancel order", danger: true, confirm: "Cancel this unpaid order and release its stock?" }],
  PAID: [{ to: "SHIPPED", label: "Mark as shipped" }],
  SHIPPED: [{ to: "DELIVERED", label: "Mark as delivered" }],
};

export default async function AdminOrderPage({ params }: Props) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();
  const actions = NEXT[order.status] ?? [];

  return (
    <>
      <Link href="/admin/orders" className="text-sm font-semibold text-cobalt hover:underline">
        All orders
      </Link>
      <AdminTitle
        sub={`Placed ${formatDateTime(order.createdAt)} by ${order.customerEmail}`}
        actions={
          actions.length > 0 ? (
            <>
              {actions.map((a, i) => (
                <ActionForm
                  // Keyed by position so the confirmation survives the next transition's button.
                  key={i}
                  action={setOrderStatus.bind(null, order.id, a.to)}
                  confirm={a.confirm}
                  className="flex flex-col items-end gap-1"
                  messageClassName="text-right"
                >
                  <SubmitButton className={a.danger ? "btn btn-danger" : "btn btn-primary"} pendingLabel="Updating…">
                    {a.label}
                  </SubmitButton>
                </ActionForm>
              ))}
            </>
          ) : null
        }
      >
        <span className="tabular">{order.orderNumber}</span> <OrderStatusBadge status={order.status} />
      </AdminTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Panel title="Progress">
            <OrderTimeline order={order} />
          </Panel>
          <Panel title="Items">
            <OrderLines order={order} linkProducts={false} />
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Ship to">
            <OrderAddress order={order} />
          </Panel>
          <Panel title="Totals">
            <OrderTotals order={order} />
          </Panel>
        </div>
      </div>
    </>
  );
}
