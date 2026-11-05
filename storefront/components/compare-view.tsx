"use client";

import clsx from "clsx";
import { useState } from "react";

/** Wraps the server-rendered comparison table and hides identical rows on request. */
export function CompareView({ children, canFilter }: { children: React.ReactNode; canFilter: boolean }) {
  const [onlyDiff, setOnlyDiff] = useState(false);
  return (
    <div className={clsx(onlyDiff && "compare-only-diff")}>
      {canFilter && (
        <label className="mb-4 inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
          <input
            type="checkbox"
            checked={onlyDiff}
            onChange={(e) => setOnlyDiff(e.target.checked)}
            className="size-4 accent-[var(--color-cobalt)]"
          />
          Show only differences
        </label>
      )}
      {children}
    </div>
  );
}
