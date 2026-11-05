"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { deliveryFeeCents } from "@/lib/fulfillment";
import { formatMoney } from "@/lib/money";
import type { FulfillmentMethod, Money, Zone } from "@/lib/types";

type CheckoutState = {
  method: FulfillmentMethod;
  setMethod: (m: FulfillmentMethod) => void;
  zone: Zone | null;
  setZone: (z: Zone | null) => void;
  subtotalCents: number;
  currency: string;
};

const Ctx = createContext<CheckoutState | null>(null);

/** Shares the delivery method and zone between the checkout form and the order summary next to it. */
export function CheckoutProvider({
  initialMethod,
  initialZone,
  subtotalCents,
  currency,
  children,
}: {
  initialMethod: FulfillmentMethod;
  initialZone: Zone | null;
  subtotalCents: number;
  currency: string;
  children: React.ReactNode;
}) {
  const [method, setMethod] = useState(initialMethod);
  const [zone, setZone] = useState<Zone | null>(initialZone);
  const value = useMemo(
    () => ({ method, setMethod, zone, setZone, subtotalCents, currency }),
    [method, zone, subtotalCents, currency],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCheckoutState(): CheckoutState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCheckoutState must be used inside CheckoutProvider");
  return v;
}

/** Order summary totals in LOCAL mode: delivery fee from the zone, or free pickup. */
export function LocalCheckoutTotals() {
  const { method, zone, subtotalCents, currency } = useCheckoutState();
  const money = (cents: number): Money => ({ cents, currency });
  const fee = method === "PICKUP" ? 0 : zone ? deliveryFeeCents(subtotalCents, zone) : null;
  return (
    <dl className="tabular space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-soft">Subtotal</dt>
        <dd>{formatMoney(money(subtotalCents))}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-soft">{method === "PICKUP" ? "Pickup" : "Delivery"}</dt>
        <dd>{fee === null ? "Enter your postcode" : fee === 0 ? "Free" : formatMoney(money(fee))}</dd>
      </div>
      <div className="flex justify-between border-t border-mist pt-3 text-base font-bold">
        <dt>Total</dt>
        <dd>{formatMoney(money(subtotalCents + (fee ?? 0)))}</dd>
      </div>
    </dl>
  );
}
