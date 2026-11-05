import type { Spec } from "@/lib/types";

/** Groups specs by their group (null → "General"), keeping the order the shop entered them in. */
export function groupSpecs(specs: Spec[]): { group: string; specs: Spec[] }[] {
  const groups = new Map<string, Spec[]>();
  for (const spec of specs) {
    const name = spec.group?.trim() || "General";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(spec);
  }
  return [...groups.entries()].map(([group, list]) => ({ group, specs: list }));
}

export function SpecTable({ specs, id = "specifications" }: { specs: Spec[]; id?: string }) {
  if (specs.length === 0) return null;
  const groups = groupSpecs(specs);
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-14 scroll-mt-6">
      <h2 id={`${id}-title`} className="headline text-2xl">
        Specifications
      </h2>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {groups.map((g) => (
          <table key={g.group} className="w-full overflow-hidden rounded-tag border border-mist bg-white text-sm">
            <caption className="bg-cloud px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-ink-soft">
              {g.group}
            </caption>
            <tbody>
              {g.specs.map((s) => (
                <tr key={s.key} className="border-t border-mist first:border-t-0">
                  <th scope="row" className="w-2/5 px-4 py-2.5 text-left font-medium text-ink-soft">
                    {s.label}
                  </th>
                  <td className="px-4 py-2.5 font-semibold">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </section>
  );
}
