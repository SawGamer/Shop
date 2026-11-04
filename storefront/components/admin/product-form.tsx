"use client";

import { useActionState } from "react";
import { Field, FormMessage, SelectField, SubmitButton } from "@/components/forms";
import { IDLE, type ActionState } from "@/lib/action-state";
import type { AdminProduct, Brand, Category } from "@/lib/types";

/** Flat categories ordered as a tree, with depth for indentation. */
function orderCategories(flat: Category[]): { cat: Category; depth: number }[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of flat) {
    const key = c.parentId ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const out: { cat: Category; depth: number }[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const c of (byParent.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ cat: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  // Orphans whose parent is missing still get listed.
  for (const c of flat) if (!seen.has(c.id)) out.push({ cat: c, depth: 0 });
  return out;
}

export function ProductForm({
  action,
  brands,
  categories,
  product,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  brands: Brand[];
  categories: Category[];
  product?: AdminProduct;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  const fe = state.fieldErrors ?? {};
  const selected = new Set(product?.categories.map((c) => c.id) ?? []);
  const ordered = orderCategories(categories);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required defaultValue={product?.name} error={fe.name} />
        <Field
          label="URL slug"
          name="slug"
          defaultValue={product?.slug}
          hint={product ? `Shop URL: /p/${product.slug}` : "Leave empty to create one from the name"}
          error={fe.slug}
        />
        <SelectField label="Brand" name="brandId" defaultValue={product?.brand.id ?? ""} error={fe.brandId}>
          <option value="" disabled>
            Choose a brand
          </option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Status" name="status" defaultValue={product?.status ?? "DRAFT"} error={fe.status}>
          <option value="DRAFT">Draft (hidden from the shop)</option>
          <option value="ACTIVE">Active (visible in the shop)</option>
          <option value="ARCHIVED">Archived</option>
        </SelectField>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-semibold">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={product?.description}
          className="field"
          aria-invalid={!!fe.description}
        />
        {fe.description && <p className="mt-1 text-sm text-signal">{fe.description}</p>}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Categories</legend>
        {ordered.length === 0 ? (
          <p className="text-sm text-ink-soft">No categories yet. Add some under Categories.</p>
        ) : (
          <div className="grid max-h-64 gap-1 overflow-y-auto rounded-control border border-mist bg-white p-3">
            {ordered.map(({ cat, depth }) => (
              <label key={cat.id} className="flex items-center gap-2 text-sm" style={{ paddingLeft: depth * 16 }}>
                <input type="checkbox" name="categoryIds" value={cat.id} defaultChecked={selected.has(cat.id)} className="size-4 accent-cobalt" />
                {cat.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
