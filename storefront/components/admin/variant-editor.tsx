"use client";

import { useActionState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import { addVariant, deleteVariant, setStock, updateVariant } from "@/lib/actions/admin";
import { IDLE } from "@/lib/action-state";
import { centsToInput } from "@/lib/money";
import type { AdminVariant } from "@/lib/types";

const input = "field py-1.5 text-sm";
const label = "mb-1 block text-xs font-semibold text-ink-soft";

function VariantRow({ productId, v }: { productId: string; v: AdminVariant }) {
  const [state, formAction] = useActionState(updateVariant.bind(null, productId, v.id), IDLE);
  const fe = state.fieldErrors ?? {};
  return (
    <li className="grid gap-3 border-b border-mist py-4 last:border-b-0 xl:grid-cols-[1fr_auto]">
      <form action={formAction} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1.4fr_0.6fr_1fr_0.8fr_0.8fr_auto]">
        <div>
          <label className={label} htmlFor={`sku-${v.id}`}>
            SKU
          </label>
          <input id={`sku-${v.id}`} name="sku" defaultValue={v.sku} className={input} aria-invalid={!!fe.sku} />
        </div>
        <div>
          <label className={label} htmlFor={`size-${v.id}`}>
            Size
          </label>
          <input id={`size-${v.id}`} name="size" defaultValue={v.size ?? ""} className={input} />
        </div>
        <div>
          <label className={label} htmlFor={`color-${v.id}`}>
            Colour
          </label>
          <input id={`color-${v.id}`} name="color" defaultValue={v.color ?? ""} className={input} />
        </div>
        <div>
          <label className={label} htmlFor={`price-${v.id}`}>
            Price
          </label>
          <input
            id={`price-${v.id}`}
            name="price"
            inputMode="decimal"
            defaultValue={centsToInput(v.price.cents)}
            className={`${input} tabular`}
            aria-invalid={!!fe.price}
          />
        </div>
        <div>
          <label className={label} htmlFor={`cmp-${v.id}`}>
            Compare at
          </label>
          <input
            id={`cmp-${v.id}`}
            name="compareAtPrice"
            inputMode="decimal"
            defaultValue={centsToInput(v.compareAtPrice?.cents)}
            placeholder="–"
            className={`${input} tabular`}
            aria-invalid={!!fe.compareAtPrice}
          />
        </div>
        <SubmitButton className="btn btn-quiet btn-sm" pendingLabel="Saving…">
          Save
        </SubmitButton>
        <div className="col-span-full">
          <FormMessage
            state={
              state.status === "error" && state.fieldErrors
                ? { ...state, message: Object.values(state.fieldErrors).join(". ") }
                : state
            }
          />
        </div>
      </form>

      <div className="flex flex-wrap items-end gap-3">
        <ActionForm action={setStock.bind(null, v.id)} className="flex items-end gap-2" messageClassName="w-full">
          <div>
            <label className={label} htmlFor={`stock-${v.id}`}>
              On hand
            </label>
            <input
              id={`stock-${v.id}`}
              name="onHand"
              type="number"
              min={0}
              defaultValue={v.onHand}
              key={v.onHand}
              className={`${input} tabular w-24`}
            />
          </div>
          <SubmitButton className="btn btn-quiet btn-sm" pendingLabel="…">
            Set stock
          </SubmitButton>
        </ActionForm>
        <p className="tabular pb-1.5 text-xs text-ink-soft">
          {v.reserved} reserved
          <br />
          <span className={v.available === 0 ? "font-semibold text-signal" : "font-semibold text-ink"}>
            {v.available} available
          </span>
        </p>
        <ActionForm
          action={deleteVariant.bind(null, productId, v.id)}
          confirm={`Delete variant ${v.sku}? This can't be undone.`}
        >
          <SubmitButton className="btn btn-danger btn-sm" pendingLabel="Deleting…">
            Delete
          </SubmitButton>
        </ActionForm>
      </div>
    </li>
  );
}

function NewVariantForm({ productId }: { productId: string }) {
  const [state, formAction] = useActionState(addVariant.bind(null, productId), IDLE);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="mt-4 rounded-control bg-paper p-4">
      <p className="mb-3 text-sm font-bold">Add a variant</p>
      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1.4fr_0.6fr_1fr_0.8fr_0.8fr_0.6fr_auto]">
        <div>
          <label className={label} htmlFor="new-sku">
            SKU
          </label>
          <input id="new-sku" name="sku" required className={input} aria-invalid={!!fe.sku} placeholder="ZA-RUN-42-BLK" />
        </div>
        <div>
          <label className={label} htmlFor="new-size">
            Size
          </label>
          <input id="new-size" name="size" className={input} placeholder="42" />
        </div>
        <div>
          <label className={label} htmlFor="new-color">
            Colour
          </label>
          <input id="new-color" name="color" className={input} placeholder="Black" />
        </div>
        <div>
          <label className={label} htmlFor="new-price">
            Price
          </label>
          <input id="new-price" name="price" inputMode="decimal" required className={`${input} tabular`} aria-invalid={!!fe.price} placeholder="129.90" />
        </div>
        <div>
          <label className={label} htmlFor="new-cmp">
            Compare at
          </label>
          <input id="new-cmp" name="compareAtPrice" inputMode="decimal" className={`${input} tabular`} aria-invalid={!!fe.compareAtPrice} placeholder="Optional" />
        </div>
        <div>
          <label className={label} htmlFor="new-onhand">
            Stock
          </label>
          <input id="new-onhand" name="onHand" type="number" min={0} defaultValue={0} className={`${input} tabular`} aria-invalid={!!fe.onHand} />
        </div>
        <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Adding…">
          Add
        </SubmitButton>
      </div>
      <FormMessage
        className="mt-2"
        state={
          state.status === "error" && state.fieldErrors
            ? { ...state, message: Object.values(state.fieldErrors).join(". ") }
            : state
        }
      />
    </form>
  );
}

export function VariantEditor({ productId, variants }: { productId: string; variants: AdminVariant[] }) {
  return (
    <div>
      {variants.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No variants yet. Add one per size and colour; shoppers can only buy variants with stock.
        </p>
      ) : (
        <ul>
          {variants.map((v) => (
            <VariantRow key={v.id} productId={productId} v={v} />
          ))}
        </ul>
      )}
      <NewVariantForm productId={productId} />
    </div>
  );
}
