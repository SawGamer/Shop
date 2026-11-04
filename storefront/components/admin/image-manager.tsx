"use client";

import { useActionState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import { deleteImage, uploadImage } from "@/lib/actions/admin";
import { IDLE } from "@/lib/action-state";
import type { ProductImage } from "@/lib/types";

export function ImageManager({ productId, images }: { productId: string; images: ProductImage[] }) {
  const [state, formAction] = useActionState(uploadImage.bind(null, productId), IDLE);
  const sorted = [...images].sort((a, b) => a.position - b.position);

  return (
    <div>
      {sorted.length === 0 ? (
        <p className="mb-4 text-sm text-ink-soft">No images yet. The first image is the one shown in listings.</p>
      ) : (
        <ul className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {sorted.map((img, i) => (
            <li key={img.id} className="space-y-2">
              <div className="relative aspect-square overflow-hidden rounded-tag bg-cloud">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt ?? ""} className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-tag bg-ink px-1.5 py-0.5 text-xs font-semibold text-paper">
                    Main
                  </span>
                )}
              </div>
              <ActionForm action={deleteImage.bind(null, productId, img.id)} confirm="Delete this image?">
                <SubmitButton className="btn btn-danger btn-sm w-full" pendingLabel="Deleting…">
                  Delete
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-control bg-paper p-4">
        <div>
          <label htmlFor="img-file" className="mb-1 block text-xs font-semibold text-ink-soft">
            Image (JPEG, PNG or GIF, up to 10 MB)
          </label>
          <input
            id="img-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/gif"
            required
            className="block text-sm file:mr-3 file:rounded-control file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-paper"
          />
        </div>
        <div className="min-w-48 flex-1">
          <label htmlFor="img-alt" className="mb-1 block text-xs font-semibold text-ink-soft">
            Description for screen readers
          </label>
          <input id="img-alt" name="alt" className="field py-1.5 text-sm" placeholder="Side view, black upper, white sole" />
        </div>
        <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Uploading…">
          Upload image
        </SubmitButton>
        <FormMessage state={state} className="w-full" />
      </form>
    </div>
  );
}
