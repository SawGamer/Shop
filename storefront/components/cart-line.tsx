"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { FormMessage } from "./forms";
import { ProductImage } from "./ui";
import { removeCartItem, updateCartItem } from "@/lib/actions/cart";
import { IDLE } from "@/lib/action-state";
import { formatMoney } from "@/lib/money";
import type { CartItem } from "@/lib/types";
import { describeSize } from "@/lib/colors";

export function CartLine({ item }: { item: CartItem }) {
  const [state, formAction, pending] = useActionState(updateCartItem.bind(null, item.variantId), IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const max = Math.max(item.quantity, Math.min(99, item.available));
  const over = item.quantity > item.available;

  return (
    <li className="grid grid-cols-[5.5rem_1fr] gap-4 border-b border-mist py-5 sm:grid-cols-[7rem_1fr_auto]">
      <Link href={`/p/${item.productSlug}`} className="block aspect-square overflow-hidden rounded-tag bg-cloud">
        <ProductImage src={item.imageUrl} alt={item.productName} name={item.productName} sizes="sm" />
      </Link>

      <div className="min-w-0">
        <Link href={`/p/${item.productSlug}`} className="font-semibold hover:underline">
          {item.productName}
        </Link>
        <p className="mt-0.5 text-sm text-ink-soft">
          {[item.color, describeSize(item.size)].filter(Boolean).join(", ")}
        </p>
        <p className="tabular mt-0.5 text-sm text-ink-soft">{formatMoney(item.unitPrice)} each</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <form ref={formRef} action={formAction} className="flex items-center gap-2">
            <label htmlFor={`qty-${item.variantId}`} className="sr-only">
              Quantity for {item.productName}
            </label>
            <select
              key={item.quantity}
              id={`qty-${item.variantId}`}
              name="quantity"
              defaultValue={item.quantity}
              onChange={() => formRef.current?.requestSubmit()}
              disabled={pending}
              className="field w-20 py-1.5"
            >
              {Array.from({ length: max + 1 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Remove" : n}
                </option>
              ))}
            </select>
            <noscript>
              <button type="submit" className="btn btn-quiet btn-sm">
                Update
              </button>
            </noscript>
          </form>
          <form action={removeCartItem.bind(null, item.variantId)}>
            <button type="submit" className="text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
              Remove
            </button>
          </form>
        </div>
        {over && (
          <p className="mt-2 text-sm text-signal">
            {item.available === 0 ? "This option just sold out." : `Only ${item.available} left. Lower the quantity to check out.`}
          </p>
        )}
        <FormMessage state={state} className="mt-2" />
      </div>

      <p className="tabular col-start-2 text-right font-semibold sm:col-start-3">{formatMoney(item.lineTotal)}</p>
    </li>
  );
}
