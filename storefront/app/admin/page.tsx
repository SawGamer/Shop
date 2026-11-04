import Link from "next/link";
import { AdminTitle, Panel, td, th } from "@/components/admin/bits";
import { ReindexButton } from "@/components/admin/reindex-button";
import { OrderStatusBadge } from "@/components/ui";
import { getDashboard } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export default async function AdminDashboard() {
  const d = await getDashboard();

  const revenue = [
    { label: "Today", value: d.revenue.today, orders: d.orders.today },
    { label: "Last 7 days", value: d.revenue.last7Days, orders: d.orders.last7Days },
    { label: "Last 30 days", value: d.revenue.last30Days, orders: d.orders.last30Days },
  ];

  return (
    <>
      <AdminTitle actions={<ReindexButton />}>Dashboard</AdminTitle>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Panel title="Revenue">
          <dl className="grid grid-cols-3 gap-4">
            {revenue.map((r) => (
              <div key={r.label}>
                <dt className="text-sm text-ink-soft">{r.label}</dt>
                <dd className="headline tabular mt-1 text-2xl sm:text-3xl">{formatMoney(r.value)}</dd>
                <dd className="tabular text-sm text-ink-soft">{r.orders} {r.orders === 1 ? "order" : "orders"}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Needs attention">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <Link href="/admin/orders?status=PAID" className="font-semibold text-cobalt hover:underline">
                Paid, waiting to ship
              </Link>
              <span className="headline tabular text-2xl">{d.orders.toShip}</span>
            </li>
            <li className="flex items-center justify-between">
              <Link href="/admin/orders?status=PENDING_PAYMENT" className="font-semibold text-cobalt hover:underline">
                Awaiting payment
              </Link>
              <span className="headline tabular text-2xl">{d.orders.pendingPayment}</span>
            </li>
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel
          title="Recent orders"
          actions={
            <Link href="/admin/orders" className="text-sm font-semibold text-cobalt hover:underline">
              All orders
            </Link>
          }
        >
          {d.recentOrders.length === 0 ? (
            <p className="text-sm text-ink-soft">No orders yet.</p>
          ) : (
            <div className="-mx-3 overflow-x-auto">
              <table className="tabular w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Order</th>
                    <th className={th}>Customer</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist">
                  {d.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className={td}>
                        <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:underline">
                          {o.orderNumber}
                        </Link>
                        <p className="text-xs text-ink-faint">{formatDateTime(o.createdAt)}</p>
                      </td>
                      <td className={`${td} max-w-[12rem] truncate`}>{o.customerEmail}</td>
                      <td className={td}>
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Low stock">
          {d.lowStock.length === 0 ? (
            <p className="text-sm text-ink-soft">Every variant has enough stock.</p>
          ) : (
            <div className="-mx-3 overflow-x-auto">
              <table className="tabular w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Product</th>
                    <th className={th}>Variant</th>
                    <th className={`${th} text-right`}>Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist">
                  {d.lowStock.map((v) => (
                    <tr key={v.variantId}>
                      <td className={td}>
                        <Link href={`/admin/products/${v.productId}`} className="font-semibold hover:underline">
                          {v.productName}
                        </Link>
                        <p className="text-xs text-ink-faint">{v.sku}</p>
                      </td>
                      <td className={td}>{[v.color, v.size && `Size ${v.size}`].filter(Boolean).join(", ") || "–"}</td>
                      <td className={`${td} text-right font-semibold ${v.available === 0 ? "text-signal" : ""}`}>
                        {v.available}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
