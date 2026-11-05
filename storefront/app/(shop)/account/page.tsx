import type { Metadata } from "next";
import Link from "next/link";
import { AccountNav } from "@/components/account/account-nav";
import { ResendVerificationButton } from "@/components/auth-forms";
import { Pagination } from "@/components/pagination";
import { ReorderButton } from "@/components/reorder-button";
import { Container, EmptyState, OrderStatusBadge, PageTitle, ServiceDown } from "@/components/ui";
import { logout } from "@/lib/actions/auth";
import { isAdmin, requireUser } from "@/lib/auth";
import { getMyOrders } from "@/lib/data";
import { getFulfillmentConfig } from "@/lib/fulfillment-data";
import { formatDate, pluralize } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getShop } from "@/lib/shop";
import type { OrderSummary, Page } from "@/lib/types";

export const metadata: Metadata = { title: "Your account" };

type Props = { searchParams: Promise<{ page?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const user = await requireUser("/account");
  const { theme } = await getShop();
  const { mode } = await getFulfillmentConfig();
  const pageNum = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);

  let orders: Page<OrderSummary> | null = null;
  try {
    orders = await getMyOrders(pageNum - 1);
  } catch {
    orders = null;
  }

  return (
    <Container className="py-10">
      <PageTitle>Hi, {user.firstName}</PageTitle>
      <AccountNav current="/account" />
      <div className="grid gap-10 lg:grid-cols-[20rem_1fr]">
        <section aria-labelledby="profile" className="h-fit space-y-4 rounded-tag bg-white p-5">
          <h2 id="profile" className="headline text-xl">
            Profile
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-ink-faint">Name</dt>
              <dd className="font-semibold">
                {user.firstName} {user.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-ink-faint">Email</dt>
              <dd className="flex flex-wrap items-center gap-2 font-semibold">
                {user.email}
                {user.emailVerified ? (
                  <span className="rounded-tag bg-moss/12 px-1.5 py-0.5 text-xs font-semibold text-moss">Verified</span>
                ) : (
                  <span className="rounded-tag bg-sticker/60 px-1.5 py-0.5 text-xs font-semibold">Not verified</span>
                )}
              </dd>
            </div>
          </dl>
          {!user.emailVerified && (
            <div className="space-y-2 border-t border-mist pt-4">
              <p className="text-sm text-ink-soft">Confirm your email so order and shipping updates reach you.</p>
              <ResendVerificationButton />
            </div>
          )}
          <div className="flex flex-wrap gap-2 border-t border-mist pt-4">
            {isAdmin(user) && (
              <Link href="/admin" className="btn btn-ink btn-sm">
                Open admin
              </Link>
            )}
            <form action={logout}>
              <button type="submit" className="btn btn-quiet btn-sm">
                Log out
              </button>
            </form>
          </div>
        </section>

        <section aria-labelledby="orders">
          <h2 id="orders" className="headline mb-4 text-2xl">
            Your orders
          </h2>
          {!orders ? (
            <ServiceDown what="your orders" />
          ) : orders.items.length === 0 ? (
            <EmptyState title="No orders yet" action={{ href: "/search", label: theme.copy.firstOrder }}>
              When you buy something, it shows up here with its delivery status.
            </EmptyState>
          ) : (
            <>
              <ul className="divide-y divide-mist border-y border-mist">
                {orders.items.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-white">
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-1 py-4 sm:grid-cols-[10rem_1fr_auto_auto]"
                    >
                      <span className="tabular font-semibold">{o.orderNumber}</span>
                      <span className="text-sm text-ink-soft">
                        {formatDate(o.createdAt)}, {pluralize(o.itemCount, "item")}
                      </span>
                      <OrderStatusBadge status={o.status} />
                      <span className="tabular text-right font-semibold">{formatMoney(o.total)}</span>
                    </Link>
                    {mode === "LOCAL" && <ReorderButton orderId={o.id} className="px-1 pb-3 sm:pb-0" />}
                  </li>
                ))}
              </ul>
              <Pagination
                page={pageNum}
                totalPages={orders.totalPages}
                hrefFor={(p) => (p === 1 ? "/account" : `/account?page=${p}`)}
              />
            </>
          )}
        </section>
      </div>
    </Container>
  );
}
