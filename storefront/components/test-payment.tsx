"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "./forms";
import { cancelTestPayment, completeTestPayment } from "@/lib/actions/checkout";
import { IDLE } from "@/lib/action-state";

export function TestPaymentButtons({ sessionId, orderId, totalLabel }: { sessionId: string; orderId: string; totalLabel: string }) {
  const [payState, pay] = useActionState(completeTestPayment.bind(null, sessionId, orderId), IDLE);
  const [cancelState, cancel] = useActionState(cancelTestPayment.bind(null, sessionId, orderId), IDLE);
  return (
    <div className="space-y-3">
      <form action={pay}>
        <SubmitButton className="btn btn-primary w-full text-base" pendingLabel="Confirming payment…">
          Pay {totalLabel}
        </SubmitButton>
      </form>
      <form action={cancel}>
        <SubmitButton className="btn btn-quiet w-full" pendingLabel="Cancelling…">
          Cancel payment
        </SubmitButton>
      </form>
      <FormMessage state={payState.status !== "idle" ? payState : cancelState} />
    </div>
  );
}
