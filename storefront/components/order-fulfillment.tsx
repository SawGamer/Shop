import { describeFulfillment } from "@/lib/fulfillment";
import type { Order } from "@/lib/types";

/** Title of the address box: where the order goes, or which store it is collected from. */
export function addressHeading(order: Order): string {
  if (order.fulfillment?.method === "PICKUP") return "Pickup store";
  if (order.fulfillment?.method === "DELIVERY") return "Delivery address";
  return "Ships to";
}

/** "Delivery Thu 7 Nov, 10:00–11:00 · Berlin Mitte". Renders nothing for parcel orders. */
export function FulfillmentBlock({
  order,
  timeZone,
  heading = true,
  className,
}: {
  order: Order;
  timeZone: string;
  heading?: boolean;
  className?: string;
}) {
  const f = order.fulfillment;
  if (!f) return null;
  return (
    <div className={className}>
      {heading && <h2 className="mb-2 text-sm font-semibold text-ink-soft">{f.method === "PICKUP" ? "Pickup" : "Delivery"}</h2>}
      <p className="text-sm font-semibold">{describeFulfillment(f, timeZone)}</p>
    </div>
  );
}
