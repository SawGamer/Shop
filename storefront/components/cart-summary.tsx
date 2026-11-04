import { formatMoney } from "@/lib/money";
import type { Cart } from "@/lib/types";

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
