import type { Metadata } from "next";
import Link from "next/link";
import { AdminTitle, FilterTabs, td, th } from "@/components/admin/bits";
import { Pagination } from "@/components/pagination";
import { OrderStatusBadge } from "@/components/ui";
import { getAdminOrders } from "@/lib/data";
import { formatDateTime, ORDER_STATUS_LABEL } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { OrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Orders" };

type Props = { searchParams: Promise<{ q?: string; status?: string; page?: string }> };

const STATUSES: OrderStatus[] = ["PAID", "PENDING_PAYMENT", "SHIPPED", "DELIVERED", "CANCELLED"];

function hrefWith(params: { q?: string; status?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const result = await getAdminOrders({ q, status, page: page - 1 });

  return (
    <>
      <AdminTitle sub={`${result.totalItems} orders`}>Orders</AdminTitle>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <FilterTabs
          items={[
            { label: "All", href: hrefWith({ q }), active: !status },
            ...STATUSES.map((s) => ({
              label: s === "PAID" ? "To ship" : ORDER_STATUS_LABEL[s],
              href: hrefWith({ q, status: s }),
              active: status === s,
            })),
          ]}
        />
        <form action="/admin/orders" method="get" role="search" className="mb-5 flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="orders-q" className="sr-only">
            Search orders
          </label>
          <input id="orders-q" name="q" type="search" defaultValue={q} placeholder="Order number or email" className="field w-64 py-1.5" />
          <button type="submit" className="btn btn-quiet btn-sm">
            Search
          </button>
        </form>
      </div>

      {result.items.length === 0 ? (
        <p className="rounded-tag bg-white p-6 text-ink-soft">
          {q || status ? "No orders match. Clear the search or pick another status." : "No orders yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-tag bg-white">
          <table className="tabular w-full min-w-[40rem] text-sm">
            <thead className="border-b border-mist">
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Placed</th>
                <th className={th}>Customer</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Items</th>
                <th className={`${th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {result.items.map((o) => (
                <tr key={o.id} className="hover:bg-paper/60">
                  <td className={td}>
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className={`${td} text-ink-soft`}>{formatDateTime(o.createdAt)}</td>
                  <td className={`${td} max-w-[14rem] truncate`}>{o.customerEmail}</td>
                  <td className={td}>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className={`${td} text-right`}>{o.itemCount}</td>
                  <td className={`${td} text-right font-semibold`}>{formatMoney(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={result.totalPages} hrefFor={(p) => hrefWith({ q, status, page: p })} />
    </>
  );
}
