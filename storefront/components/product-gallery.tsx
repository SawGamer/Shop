"use client";

import clsx from "clsx";
import { useState } from "react";
import { ProductImage } from "./ui";
import type { ProductImage as Img } from "@/lib/types";

export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const [active, setActive] = useState(0);
  const current = sorted[active];

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-tag bg-cloud">
        <ProductImage src={current?.url} alt={current?.alt || name} name={name} sizes="lg" />
      </div>
      {sorted.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {sorted.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1} of ${sorted.length}`}
                aria-pressed={i === active}
                className={clsx(
                  "block aspect-square w-full overflow-hidden rounded-tag bg-cloud ring-offset-2 ring-offset-paper",
                  i === active ? "ring-2 ring-ink" : "opacity-80 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
