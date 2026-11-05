"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { IDLE } from "@/lib/action-state";
import { deleteAccount } from "@/lib/actions/auth";

/** The danger zone: the account is only deleted after the password and an explicit tick. */
export function DeleteAccountForm() {
  const [state, formAction] = useActionState(deleteAccount, IDLE);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field
        label="Your password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={fe.password}
      />
      <div>
        <label className="flex items-start gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="confirm"
            className="mt-0.5 size-4 accent-signal"
            aria-invalid={!!fe.confirm}
            aria-describedby={fe.confirm ? "confirm-err" : undefined}
          />
          I understand that deleting my account is permanent.
        </label>
        {fe.confirm && (
          <p id="confirm-err" className="mt-1 text-sm text-signal">
            {fe.confirm}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="btn btn-danger" pendingLabel="Deleting…">
          Delete my account
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
