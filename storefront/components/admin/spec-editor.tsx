"use client";

import { useActionState, useId, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { saveSpecs } from "@/lib/actions/admin";
import { IDLE } from "@/lib/action-state";
import type { Spec } from "@/lib/types";

type Row = { id: number; group: string; label: string; value: string; filterable: boolean };

const input = "field py-1.5 text-sm";

/** Edit a product's specification table; rows are saved together (the API replaces all specs). */
export function SpecEditor({ productId, specs }: { productId: string; specs: Spec[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    specs.map((s, i) => ({ id: i, group: s.group ?? "", label: s.label, value: s.value, filterable: s.filterable })),
  );
  const [nextId, setNextId] = useState(specs.length);
  const [state, formAction] = useActionState(saveSpecs.bind(null, productId), IDLE);
  const groupsId = useId();
  const groups = [...new Set(rows.map((r) => r.group.trim()).filter(Boolean))];

  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const move = (index: number, by: -1 | 1) =>
    setRows((rs) => {
      const target = index + by;
      if (target < 0 || target >= rs.length) return rs;
      const copy = [...rs];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  const add = () => {
    const last = rows.at(-1);
    setRows((rs) => [...rs, { id: nextId, group: last?.group ?? "", label: "", value: "", filterable: false }]);
    setNextId((n) => n + 1);
  };

  return (
    <form action={formAction}>
      <input
        type="hidden"
        name="specs"
        value={JSON.stringify(rows.map(({ group, label, value, filterable }) => ({ group, label, value, filterable })))}
      />
      <datalist id={groupsId}>
        {groups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <p className="mb-3 text-sm text-ink-soft">
        Shown as a table on the product page and on the compare page. Tick <strong>Filter</strong> to offer a spec as a
        search filter, for example RAM or screen size.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-control border border-dashed border-mist px-4 py-6 text-center text-sm text-ink-soft">
          No specifications yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.id}
              className="grid grid-cols-2 items-center gap-2 rounded-control border border-mist bg-white p-2 sm:grid-cols-[1fr_1.2fr_1.4fr_auto_auto]"
            >
              <input
                aria-label={`Group, row ${i + 1}`}
                placeholder="Group (e.g. Display)"
                list={groupsId}
                value={r.group}
                onChange={(e) => update(r.id, { group: e.target.value })}
                className={input}
                maxLength={60}
              />
              <input
                aria-label={`Label, row ${i + 1}`}
                placeholder="Label (e.g. Screen size)"
                value={r.label}
                onChange={(e) => update(r.id, { label: e.target.value })}
                className={input}
                maxLength={80}
              />
              <input
                aria-label={`Value, row ${i + 1}`}
                placeholder="Value (e.g. 6.4″)"
                value={r.value}
                onChange={(e) => update(r.id, { value: e.target.value })}
                className={`${input} col-span-2 sm:col-span-1`}
                maxLength={200}
              />
              <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                <input
                  type="checkbox"
                  checked={r.filterable}
                  onChange={(e) => update(r.id, { filterable: e.target.checked })}
                  className="size-4 accent-[var(--color-cobalt)]"
                />
                Filter
              </label>
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move row ${i + 1} up`}
                  className="btn btn-quiet btn-sm px-2 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  aria-label={`Move row ${i + 1} down`}
                  className="btn btn-quiet btn-sm px-2 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                  aria-label={`Remove row ${i + 1}`}
                  className="btn btn-quiet btn-sm px-2 text-signal"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={add} className="btn btn-quiet btn-sm" disabled={rows.length >= 60}>
          Add specification
        </button>
        <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Saving…">
          Save specifications
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
