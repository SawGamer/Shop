"use client";

import clsx from "clsx";
import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "./forms";
import { reorderOrder } from "@/lib/actions/fulfillment";
import type { ReorderState } from "@/lib/fulfillment";

const IDLE: ReorderState = { status: "idle" };

/** "Buy again": puts the items of a past order into the cart, then says what could and couldn't be added. */
export function ReorderButton({ orderId, className }: { orderId: string; className?: string }) {
  const [state, action] = useActionState(reorderOrder.bind(null, orderId), IDLE);
  return (
    <div className={clsx("flex flex-col items-start gap-1", className)}>
      <form action={action}>
        <SubmitButton className="btn btn-quiet btn-sm" pendingLabel="Adding…">
          Buy again
        </SubmitButton>
      </form>
      {state.status !== "idle" && state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={clsx("text-sm", state.status === "error" ? "text-signal" : "text-ink")}>
          {state.message}
          {state.status === "success" && (state.added ?? 0) > 0 && (
            <>
              {" "}
              <Link href="/cart" className="font-semibold text-cobalt hover:underline">
                Go to your cart
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
