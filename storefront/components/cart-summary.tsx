import { centsToFreeDelivery, centsToMinimum, deliveryFeeCents } from "@/lib/fulfillment";
import { formatMoney } from "@/lib/money";
import type { Cart, Zone } from "@/lib/types";

export function FreeShippingMeter({ cart }: { cart: Cart }) {
  const threshold = cart.freeShippingThreshold.cents;
  if (threshold <= 0) return null;
  const remaining = threshold - cart.subtotal.cents;
  const pct = Math.min(100, Math.round((cart.subtotal.cents / threshold) * 100));
  return (
    <div>
      <p className="text-sm">
        {remaining > 0 ? (
          <>
            Add <strong className="tabular">{formatMoney({ cents: remaining, currency: cart.subtotal.currency })}</strong> more
            for free shipping.
          </>
        ) : (
          <strong className="text-moss">Your order ships free.</strong>
        )}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist"
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className={remaining > 0 ? "h-full bg-cobalt" : "h-full bg-moss"} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Totals({ cart }: { cart: Pick<Cart, "subtotal" | "shipping" | "total"> }) {
  return (
    <dl className="tabular space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-soft">Subtotal</dt>
        <dd>{formatMoney(cart.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-soft">Shipping</dt>
        <dd>{cart.shipping.cents === 0 ? "Free" : formatMoney(cart.shipping)}</dd>
      </div>
      <div className="flex justify-between border-t border-mist pt-3 text-base font-bold">
        <dt>Total</dt>
        <dd>{formatMoney(cart.total)}</dd>
      </div>
    </dl>
  );
}

function Meter({ pct, label, tone }: { pct: number; label: string; tone: "cobalt" | "moss" }) {
  return (
    <div
      className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className={tone === "moss" ? "h-full bg-moss" : "h-full bg-cobalt"} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Progress to the zone's minimum order (LOCAL fulfillment mode). Renders nothing without a minimum. */
export function MinimumOrderMeter({ cart, zone }: { cart: Cart; zone: Zone }) {
  if (zone.minOrderCents <= 0) return null;
  const missing = centsToMinimum(cart.subtotal.cents, zone);
  const currency = cart.subtotal.currency;
  const pct = Math.min(100, Math.round((cart.subtotal.cents / zone.minOrderCents) * 100));
  return (
    <div>
      <p className="text-sm">
        {missing > 0 ? (
          <>
            Add <strong className="tabular">{formatMoney({ cents: missing, currency })}</strong> more to reach the minimum
            order of <span className="tabular">{formatMoney({ cents: zone.minOrderCents, currency })}</span>.
          </>
        ) : (
          <strong className="text-moss">Minimum order reached.</strong>
        )}
      </p>
      <Meter pct={pct} label="Progress to the minimum order" tone={missing > 0 ? "cobalt" : "moss"} />
    </div>
  );
}

/** Progress to free delivery. Renders nothing when the zone has no free-delivery threshold or delivery is free anyway. */
export function FreeDeliveryMeter({ cart, zone }: { cart: Cart; zone: Zone }) {
  const missing = centsToFreeDelivery(cart.subtotal.cents, zone);
  if (missing === null || zone.feeCents === 0 || !zone.freeFromCents) return null;
  const currency = cart.subtotal.currency;
  const pct = Math.min(100, Math.round((cart.subtotal.cents / zone.freeFromCents) * 100));
  return (
    <div>
      <p className="text-sm">
        {missing > 0 ? (
          <>
            Add <strong className="tabular">{formatMoney({ cents: missing, currency })}</strong> more for free delivery.
          </>
        ) : (
          <strong className="text-moss">Your delivery is free.</strong>
        )}
      </p>
      <Meter pct={pct} label="Progress to free delivery" tone={missing > 0 ? "cobalt" : "moss"} />
    </div>
  );
}

/** Cart totals in LOCAL mode: the zone's delivery fee instead of the flat shipping fee. */
export function LocalTotals({ cart, zone }: { cart: Cart; zone: Zone | null }) {
  const currency = cart.subtotal.currency;
  const fee = zone ? deliveryFeeCents(cart.subtotal.cents, zone) : null;
  return (
    <dl className="tabular space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-soft">Subtotal</dt>
        <dd>{formatMoney(cart.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-soft">Delivery</dt>
        <dd>{fee === null ? "At checkout" : fee === 0 ? "Free" : formatMoney({ cents: fee, currency })}</dd>
      </div>
      <div className="flex justify-between border-t border-mist pt-3 text-base font-bold">
        <dt>{fee === null ? "Subtotal" : "Total"}</dt>
        <dd>{formatMoney({ cents: cart.subtotal.cents + (fee ?? 0), currency })}</dd>
      </div>
    </dl>
  );
}
