"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { reindexSearch } from "@/lib/actions/admin";
import { IDLE } from "@/lib/action-state";

export function ReindexButton() {
  const [state, formAction] = useActionState(reindexSearch, IDLE);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <SubmitButton className="btn btn-quiet btn-sm" pendingLabel="Rebuilding…">
        Rebuild search index
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
