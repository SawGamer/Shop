"use client";

import clsx from "clsx";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { FormMessage, SubmitButton } from "./forms";
import { Price, SaleSticker } from "./ui";
import { addToCart } from "@/lib/actions/cart";
import { IDLE } from "@/lib/action-state";
import { compareSizes, swatchFor } from "@/lib/colors";
import type { ProductDetail, Variant } from "@/lib/types";

function pick(variants: Variant[], color: string | null, size: string | null, hasColors: boolean, hasSizes: boolean) {
  return (
    variants.find((v) => (!hasColors || v.color === color) && (!hasSizes || v.size === size)) ?? null
  );
}

/**
 * The product's "box label": brand, name, price, colour, size grid and add to cart.
 * Sizes without stock in the chosen colour are disabled.
 */
export type PickerLabels = { size: string; sizeShort: string; color: string; choose: string };

const DEFAULT_LABELS: PickerLabels = { size: "Size (EU)", sizeShort: "Size", color: "Colour", choose: "Choose a size" };

export function VariantPicker({
  product,
  labels = DEFAULT_LABELS,
  sizeOptions = "grid",
  colorOptions = "chips",
  buyBox = "label",
}: {
  product: ProductDetail;
  labels?: PickerLabels;
  sizeOptions?: "grid" | "chips";
  colorOptions?: "chips" | "swatches";
  buyBox?: "label" | "card";
}) {
  const boxed = buyBox === "label";
  const rule = boxed ? "border-ink" : "border-mist";
  const colors = product.colors;
  const sizes = useMemo(() => [...product.sizes].sort(compareSizes), [product.sizes]);
  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;

  const firstInStockColor =
    colors.find((c) => product.variants.some((v) => v.color === c && v.inStock)) ?? colors[0] ?? null;
  const [color, setColor] = useState<string | null>(firstInStockColor);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [state, formAction] = useActionState(addToCart, IDLE);

  const variant = hasSizes && !size ? null : pick(product.variants, color, size, hasColors, hasSizes);
  const single = !hasColors && !hasSizes ? product.variants[0] ?? null : null;
  const chosen = single ?? variant;

  const price = chosen?.price ?? product.price;
  const compareAt = chosen ? chosen.compareAtPrice : product.compareAtPrice;
  const maxQty = Math.max(1, Math.min(10, chosen?.available ?? 1));

  function sizeAvailable(s: string) {
    return product.variants.some((v) => v.size === s && (!hasColors || v.color === color) && v.inStock);
  }
  function sizeExists(s: string) {
    return product.variants.some((v) => v.size === s && (!hasColors || v.color === color));
  }

  let stockHint: React.ReactNode = null;
  if (chosen) {
    if (!chosen.inStock)
      stockHint = <span className="text-signal">Sold out{hasSizes ? ` in this ${labels.sizeShort.toLowerCase()}` : ""}</span>;
    else if (chosen.available <= 5) stockHint = <span className="text-signal">Only {chosen.available} left</span>;
    else stockHint = <span className="text-moss">In stock, ready to ship</span>;
  } else if (hasSizes) {
    stockHint = <span className="text-ink-soft">{labels.choose} to see stock</span>;
  }

  return (
    <div className={clsx("rounded-tag bg-white", boxed ? "border-2 border-ink" : "border border-mist shadow-sm")}>
      <div className={clsx("px-5 py-4", boxed ? "border-b-2" : "border-b", rule)}>
        <p className="text-sm font-semibold text-ink-soft">{product.brand.name}</p>
        <h1 className="headline mt-1 text-[2.4rem] leading-[0.95] sm:text-5xl">{product.name}</h1>
        <div className="mt-3 flex items-center gap-3 text-lg">
          <Price price={price} compareAt={compareAt} />
          <SaleSticker price={price} compareAt={compareAt} />
        </div>
      </div>

      <form action={formAction} className="space-y-5 px-5 py-5">
        <input type="hidden" name="variantId" value={chosen?.id ?? ""} />

        {hasColors && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              {labels.color}: <span className="font-normal text-ink-soft">{color}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => {
                const sw = swatchFor(c);
                const anyStock = product.variants.some((v) => v.color === c && v.inStock);
                const select = () => {
                  setColor(c);
                  if (size && !product.variants.some((v) => v.color === c && v.size === size)) setSize(null);
                };
                if (colorOptions === "swatches" && sw) {
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={select}
                      aria-pressed={c === color}
                      aria-label={`${c}${anyStock ? "" : ", sold out"}`}
                      title={c}
                      className={clsx(
                        "relative size-10 rounded-full ring-1 ring-ink/20 ring-offset-2 ring-offset-white transition",
                        c === color ? "ring-2 ring-ink" : "hover:ring-ink/60",
                        !anyStock && "opacity-40",
                      )}
                      style={{ background: sw }}
                    >
                      {!anyStock && (
                        <span aria-hidden className="absolute inset-0 m-auto h-px w-full rotate-45 bg-ink/60" />
                      )}
                    </button>
                  );
                }
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      if (size && !product.variants.some((v) => v.color === c && v.size === size)) setSize(null);
                    }}
                    aria-pressed={c === color}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-control border px-3 py-1.5 text-sm",
                      c === color ? "border-ink bg-ink text-paper" : "border-mist hover:border-ink",
                      !anyStock && "text-ink-faint line-through",
                    )}
                  >
                    {sw && (
                      <span
                        aria-hidden
                        className={clsx("size-3.5 rounded-full border", c === color ? "border-paper/70" : "border-ink/25")}
                        style={{ background: sw }}
                      />
                    )}
                    {c}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {hasSizes && (
          <fieldset>
            <legend className="mb-2 flex w-full justify-between text-sm font-semibold">
              <span>{labels.size}</span>
              {size && <span className="font-normal text-ink-soft">Selected: {size}</span>}
            </legend>
            <div className={sizeOptions === "grid" ? "grid grid-cols-5 gap-1.5 sm:grid-cols-6" : "flex flex-wrap gap-2"}>
              {sizes.map((s) => {
                const exists = sizeExists(s);
                const available = sizeAvailable(s);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!available}
                    onClick={() => {
                      setSize(s);
                      setQuantity(1);
                    }}
                    aria-pressed={s === size}
                    aria-label={`${labels.sizeShort} ${s}${available ? "" : exists ? ", sold out" : `, not available in this ${labels.color.toLowerCase()}`}`}
                    className={clsx(
                      sizeOptions === "grid"
                        ? "headline tabular h-14 rounded-tag border text-2xl transition-colors"
                        : "tabular h-11 rounded-control border px-4 text-sm font-semibold transition-colors",
                      s === size ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white hover:border-ink hover:bg-sticker",
                      !available && "cursor-not-allowed border-transparent bg-cloud text-ink-faint line-through hover:border-transparent hover:bg-cloud",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <p className="text-sm font-semibold" aria-live="polite">
          {stockHint}
        </p>

        <div className="flex gap-3">
          <label className="sr-only" htmlFor="qty">
            Quantity
          </label>
          <select
            id="qty"
            name="quantity"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="field w-20"
            disabled={!chosen?.inStock}
          >
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <SubmitButton
            className="btn btn-primary flex-1 text-base"
            pendingLabel="Adding…"
            disabled={!chosen || !chosen.inStock}
          >
            {!chosen && hasSizes ? labels.choose : chosen && !chosen.inStock ? "Sold out" : "Add to cart"}
          </SubmitButton>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FormMessage state={state} />
          {state.status === "success" && (
            <Link href="/cart" className="text-sm font-semibold text-cobalt hover:underline">
              View cart and check out
            </Link>
          )}
        </div>
      </form>

      <dl className={clsx("tabular grid grid-cols-2 text-sm", boxed ? "border-t-2" : "border-t", rule)}>
        <div className={clsx("border-r px-5 py-3", boxed ? "border-ink/15" : "border-mist")}>
          <dt className="text-ink-faint">SKU</dt>
          <dd className="font-semibold">{chosen?.sku ?? "Choose options"}</dd>
        </div>
        <div className="px-5 py-3">
          <dt className="text-ink-faint">{hasColors ? labels.color : labels.sizeShort}</dt>
          <dd className="font-semibold">{(hasColors ? color : size) ?? "–"}</dd>
        </div>
      </dl>
    </div>
  );
}
