import type { Spec } from "./types";

export type CompareRow = { key: string; label: string; values: (string | null)[]; same: boolean };
export type CompareGroup = { group: string; rows: CompareRow[] };

/**
 * Lines up the specs of several products: every spec label present in any of them becomes a row, grouped
 * by spec group in order of first appearance. A row is `same` when every product has the same value.
 */
export function buildCompareRows(specLists: Spec[][]): CompareGroup[] {
  const groups = new Map<string, Map<string, CompareRow>>();
  specLists.forEach((specs, column) => {
    for (const spec of specs) {
      const groupName = spec.group?.trim() || "General";
      if (!groups.has(groupName)) groups.set(groupName, new Map());
      const rows = groups.get(groupName)!;
      if (!rows.has(spec.key)) {
        rows.set(spec.key, { key: spec.key, label: spec.label, values: specLists.map(() => null), same: false });
      }
      rows.get(spec.key)!.values[column] = spec.value;
    }
  });
  return [...groups.entries()].map(([group, rows]) => ({
    group,
    rows: [...rows.values()].map((row) => ({
      ...row,
      same: row.values.every((v) => v !== null && v.toLowerCase() === row.values[0]?.toLowerCase()),
    })),
  }));
}
