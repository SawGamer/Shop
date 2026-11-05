import Link from "next/link";
import { Totals } from "./cart-summary";
import { ProductImage } from "./ui";
import { COUNTRIES, formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { Order } from "@/lib/types";
import { describeSize } from "@/lib/colors";

export function OrderLines({ order, linkProducts = true }: { order: Order; linkProducts?: boolean }) {
  return (
    <ul className="divide-y divide-mist border-y border-mist">
      {order.lines.map((l) => (
        <li key={l.variantId} className="grid grid-cols-[4rem_1fr_auto] items-center gap-4 py-4 text-sm">
          <div className="aspect-square overflow-hidden rounded-tag bg-cloud">
            <ProductImage src={l.imageUrl} alt={l.productName} name={l.productName} sizes="sm" />
          </div>
          <div>
            {linkProducts ? (
              <Link href={`/p/${l.productSlug}`} className="font-semibold hover:underline">
                {l.productName}
              </Link>
            ) : (
              <p className="font-semibold">{l.productName}</p>
            )}
            <p className="text-ink-soft">
              {[l.color, describeSize(l.size), `SKU ${l.sku}`].filter(Boolean).join(", ")}
            </p>
            <p className="tabular text-ink-soft">
              {l.quantity} × {formatMoney(l.unitPrice)}
            </p>
          </div>
          <p className="tabular font-semibold">{formatMoney(l.lineTotal)}</p>
        </li>
      ))}
    </ul>
  );
}

export function OrderAddress({ order }: { order: Order }) {
  const a = order.shippingAddress;
  const country = COUNTRIES.find((c) => c.code === a.country)?.name ?? a.country;
  return (
    <address className="not-italic text-sm leading-relaxed">
      {a.fullName}
      <br />
      {a.line1}
      {a.line2 && (
        <>
          <br />
          {a.line2}
        </>
      )}
      <br />
      {a.postalCode} {a.city}
      <br />
      {country}
      {a.phone && (
        <>
          <br />
          {a.phone}
        </>
      )}
    </address>
  );
}

/** Order progress. The steps are a real sequence, so they are numbered. */
export function OrderTimeline({ order }: { order: Order }) {
  if (order.status === "CANCELLED") {
    return (
      <p className="text-sm">
        Cancelled {formatDateTime(order.cancelledAt)}. Nothing was charged.
      </p>
    );
  }
  const steps = [
    { label: "Placed", at: order.createdAt },
    { label: "Paid", at: order.paidAt },
    { label: "Shipped", at: order.shippedAt },
    { label: "Delivered", at: order.deliveredAt },
  ];
  return (
    <ol className="grid grid-cols-4 gap-2">
      {steps.map((s, i) => {
        const done = !!s.at;
        return (
          <li key={s.label} className="text-sm">
            <div className={done ? "h-1.5 rounded-full bg-cobalt" : "h-1.5 rounded-full bg-mist"} />
            <p className={done ? "mt-2 font-semibold" : "mt-2 text-ink-faint"}>
              <span className="tabular">{i + 1}.</span> {s.label}
            </p>
            {s.at && <p className="text-xs text-ink-soft">{formatDateTime(s.at)}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function OrderTotals({ order }: { order: Order }) {
  return <Totals cart={order} />;
}
