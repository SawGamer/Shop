"use client";

import { useActionState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import {
  createBrand,
  createCategory,
  deleteBrand,
  deleteCategory,
  updateBrand,
  updateCategory,
} from "@/lib/actions/admin";
import { IDLE, type ActionState } from "@/lib/action-state";
import type { Brand, Category } from "@/lib/types";

const input = "field py-1.5 text-sm";
const label = "mb-1 block text-xs font-semibold text-ink-soft";

function errorsToMessage(state: ActionState): ActionState {
  if (state.status === "error" && state.fieldErrors && Object.keys(state.fieldErrors).length) {
    return { ...state, message: Object.values(state.fieldErrors).join(". ") };
  }
  return state;
}

function ParentSelect({ id, categories, value, exclude }: { id: string; categories: Category[]; value: string | null; exclude?: string }) {
  return (
    <select id={id} name="parentId" defaultValue={value ?? ""} className={input}>
      <option value="">No parent (top level)</option>
      {categories
        .filter((c) => c.id !== exclude)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
    </select>
  );
}

export function NewCategoryForm({ categories }: { categories: Category[] }) {
  const [state, formAction] = useActionState(createCategory, IDLE);
  return (
    <form action={formAction} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <div>
        <label className={label} htmlFor="cat-name">
          Name
        </label>
        <input id="cat-name" name="name" required className={input} placeholder="Trail running" />
      </div>
      <div>
        <label className={label} htmlFor="cat-slug">
          Slug
        </label>
        <input id="cat-slug" name="slug" className={input} placeholder="From the name" />
      </div>
      <div>
        <label className={label} htmlFor="cat-parent">
          Parent
        </label>
        <ParentSelect id="cat-parent" categories={categories} value={null} />
      </div>
      <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Adding…">
        Add category
      </SubmitButton>
      <FormMessage state={errorsToMessage(state)} className="col-span-full" />
    </form>
  );
}

export function CategoryRow({ category, categories }: { category: Category; categories: Category[] }) {
  const [state, formAction] = useActionState(updateCategory.bind(null, category.id), IDLE);
  return (
    <li className="flex flex-wrap items-end gap-3 border-b border-mist py-3 last:border-b-0">
      <form action={formAction} className="grid flex-1 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <div>
          <label className={label} htmlFor={`n-${category.id}`}>
            Name
          </label>
          <input id={`n-${category.id}`} name="name" defaultValue={category.name} className={input} />
        </div>
        <div>
          <label className={label} htmlFor={`s-${category.id}`}>
            Slug
          </label>
          <input id={`s-${category.id}`} name="slug" defaultValue={category.slug} className={input} />
        </div>
        <div>
          <label className={label} htmlFor={`p-${category.id}`}>
            Parent
          </label>
          <ParentSelect id={`p-${category.id}`} categories={categories} value={category.parentId} exclude={category.id} />
        </div>
        <SubmitButton className="btn btn-quiet btn-sm" pendingLabel="Saving…">
          Save
        </SubmitButton>
        <FormMessage state={errorsToMessage(state)} className="col-span-full" />
      </form>
      <ActionForm action={deleteCategory.bind(null, category.id)} confirm={`Delete the category ${category.name}?`}>
        <SubmitButton className="btn btn-danger btn-sm" pendingLabel="Deleting…">
          Delete
        </SubmitButton>
      </ActionForm>
    </li>
  );
}

export function NewBrandForm() {
  const [state, formAction] = useActionState(createBrand, IDLE);
  return (
    <form action={formAction} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <div>
        <label className={label} htmlFor="brand-name">
          Name
        </label>
        <input id="brand-name" name="name" required className={input} placeholder="Asics" />
      </div>
      <div>
        <label className={label} htmlFor="brand-slug">
          Slug
        </label>
        <input id="brand-slug" name="slug" className={input} placeholder="From the name" />
      </div>
      <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Adding…">
        Add brand
      </SubmitButton>
      <FormMessage state={errorsToMessage(state)} className="col-span-full" />
    </form>
  );
}

export function BrandRow({ brand }: { brand: Brand }) {
  const [state, formAction] = useActionState(updateBrand.bind(null, brand.id), IDLE);
  return (
    <li className="flex flex-wrap items-end gap-3 border-b border-mist py-3 last:border-b-0">
      <form action={formAction} className="grid flex-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className={label} htmlFor={`bn-${brand.id}`}>
            Name
          </label>
          <input id={`bn-${brand.id}`} name="name" defaultValue={brand.name} className={input} />
        </div>
        <div>
          <label className={label} htmlFor={`bs-${brand.id}`}>
            Slug
          </label>
          <input id={`bs-${brand.id}`} name="slug" defaultValue={brand.slug} className={input} />
        </div>
        <SubmitButton className="btn btn-quiet btn-sm" pendingLabel="Saving…">
          Save
        </SubmitButton>
        <FormMessage state={errorsToMessage(state)} className="col-span-full" />
      </form>
      <ActionForm action={deleteBrand.bind(null, brand.id)} confirm={`Delete the brand ${brand.name}?`}>
        <SubmitButton className="btn btn-danger btn-sm" pendingLabel="Deleting…">
          Delete
        </SubmitButton>
      </ActionForm>
    </li>
  );
}
