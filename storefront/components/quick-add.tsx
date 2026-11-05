"use client";

import clsx from "clsx";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { quickAddToCart } from "@/lib/actions/cart";
import { IDLE } from "@/lib/action-state";

function Button({ name, done }: { name: string; done: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`Add ${name} to basket`}
      className={clsx(
        "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full px-3.5 text-sm font-extrabold transition",
        done ? "bg-moss text-white" : "bg-cobalt text-white hover:bg-cobalt-deep",
        pending && "opacity-70",
      )}
    >
      <span aria-hidden>{done ? "✓" : "+"}</span>
      <span>{pending ? "Adding" : done ? "Added" : "Add"}</span>
    </button>
  );
}

/** Grocery design: add one of the product straight from the card. */
export function QuickAdd({ slug, name }: { slug: string; name: string }) {
  const [state, action] = useActionState(quickAddToCart.bind(null, slug), IDLE);
  return (
    <form action={action}>
      <Button name={name} done={state.status === "success"} />
      {state.status === "error" && (
        <p role="alert" className="mt-1 text-xs text-signal">
          {state.message}
        </p>
      )}
    </form>
  );
}
