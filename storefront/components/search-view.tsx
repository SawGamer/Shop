import clsx from "clsx";
import Link from "next/link";
import { Pagination } from "./pagination";
import { ProductGrid } from "./product-card";
import { SortSelect } from "./sort-select";
import { EmptyState, ServiceDown } from "./ui";
import { compareSizes, swatchFor } from "@/lib/colors";
import { searchProducts } from "@/lib/data";
import { pluralize } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { hasActiveFilters, searchHref, SORT_LABELS, SORTS, toggle, type SearchQuery } from "@/lib/search";
import { getShop } from "@/lib/shop";
import type { Theme } from "@/lib/themes";
import type { FacetValue, SearchResponse } from "@/lib/types";

type Props = {
  query: SearchQuery;
  /** "/search" or "/c/<slug>". */
  base: string;
  /** When rendering a category page the category is part of the path, not a filter. */
  fixedCategory?: string;
};

function FacetGroup({
  title,
  values,
  isOn,
  hrefFor,
  render,
}: {
  title: string;
  values: FacetValue[];
  isOn: (v: string) => boolean;
  hrefFor: (v: string) => string;
  render?: (v: FacetValue) => React.ReactNode;
}) {
  if (values.length === 0) return null;
  return (
    <fieldset className="border-t border-mist py-4">
      <legend className="sr-only">{title}</legend>
      <p aria-hidden className="mb-2 text-sm font-semibold">
        {title}
      </p>
      <ul className="space-y-0.5">
        {values.map((v) => {
          const on = isOn(v.value);
          return (
            <li key={v.value}>
              <Link
                href={hrefFor(v.value)}
                scroll={false}
                role="checkbox"
                aria-checked={on}
                className="group flex items-center gap-2.5 rounded-control px-1 py-1 text-sm hover:bg-cloud"
              >
                <span
                  aria-hidden
                  className={clsx(
                    "flex size-4 shrink-0 items-center justify-center rounded-[3px] border",
                    on ? "border-cobalt bg-cobalt text-white" : "border-ink-faint bg-white",
                  )}
                >
                  {on && (
                    <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                    </svg>
                  )}
                </span>
                <span className="flex-1">{render ? render(v) : v.label}</span>
                <span className="tabular text-ink-faint">{v.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function SizeFacet({
  values,
  q,
  href,
  theme,
}: {
  values: FacetValue[];
  q: SearchQuery;
  href: (p: Partial<SearchQuery>) => string;
  theme: Theme;
}) {
  const { size: title, sizeShort } = theme.labels;
  const grid = theme.layout.sizeOptions === "grid";
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => compareSizes(a.value, b.value));
  return (
    <fieldset className="border-t border-mist py-4">
      <legend className="sr-only">{title}</legend>
      <p aria-hidden className="mb-2 text-sm font-semibold">
        {title}
      </p>
      <ul className={grid ? "grid grid-cols-4 gap-1.5" : "flex flex-wrap gap-1.5"}>
        {sorted.map((v) => {
          const on = q.size.includes(v.value);
          return (
            <li key={v.value}>
              <Link
                href={href({ size: toggle(q.size, v.value) })}
                scroll={false}
                role="checkbox"
                aria-checked={on}
                aria-label={`${sizeShort} ${v.label}, ${v.count} ${v.count === 1 ? "product" : "products"}`}
                className={clsx(
                  "tabular flex h-9 items-center justify-center rounded-tag border text-sm font-semibold",
                  !grid && "px-3",
                  on ? "border-ink bg-ink text-paper" : "border-mist bg-white hover:border-ink",
                )}
              >
                {v.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

export async function SearchView({ query, base, fixedCategory }: Props) {
  const q = fixedCategory ? { ...query, category: fixedCategory } : query;
  const omitCategory = !!fixedCategory;
  const href = (patch: Partial<SearchQuery>) => searchHref(base, q, patch, omitCategory);

  const { theme } = await getShop();
  const { labels, copy } = theme;

  let result: SearchResponse;
  try {
    result = await searchProducts(q);
  } catch {
    return <ServiceDown what="products" />;
  }

  const sortValue = q.sort || (q.q ? "relevance" : "newest");
  const sortOptions = SORTS.filter((s) => s !== "relevance" || q.q).map((s) => ({
    value: s,
    label: SORT_LABELS[s],
    href: href({ sort: s }),
  }));

  const chips: { label: string; href: string }[] = [];
  if (!omitCategory && q.category) {
    const label = result.facets.category.find((c) => c.value === q.category)?.label ?? q.category;
    chips.push({ label, href: href({ category: "" }) });
  }
  for (const b of q.brand) {
    chips.push({
      label: result.facets.brand.find((x) => x.value === b)?.label ?? b,
      href: href({ brand: q.brand.filter((x) => x !== b) }),
    });
  }
  for (const s of q.size) chips.push({ label: `${labels.sizeShort} ${s}`, href: href({ size: q.size.filter((x) => x !== s) }) });
  for (const c of q.color) {
    chips.push({
      label: result.facets.color.find((x) => x.value === c)?.label ?? c,
      href: href({ color: q.color.filter((x) => x !== c) }),
    });
  }
  if (q.min || q.max) {
    const currency = result.items[0]?.price.currency ?? "EUR";
    const money = (units: string) => formatMoney({ cents: Number(units) * 100, currency });
    const label = q.min && q.max ? `${money(q.min)}–${money(q.max)}` : q.min ? `From ${money(q.min)}` : `Up to ${money(q.max)}`;
    chips.push({ label, href: href({ min: "", max: "" }) });
  }
  if (q.inStock) chips.push({ label: "In stock", href: href({ inStock: false }) });
  if (q.onSale) chips.push({ label: "On sale", href: href({ onSale: false }) });

  const filters = (
    <div>
      <div className="space-y-1 pb-4">
        <Link
          href={href({ inStock: !q.inStock })}
          scroll={false}
          role="checkbox"
          aria-checked={q.inStock}
          className="flex items-center gap-2.5 rounded-control px-1 py-1 text-sm font-semibold hover:bg-cloud"
        >
          <span
            aria-hidden
            className={clsx("h-5 w-9 rounded-full p-0.5 transition-colors", q.inStock ? "bg-cobalt" : "bg-mist")}
          >
            <span className={clsx("block size-4 rounded-full bg-white transition-transform", q.inStock && "translate-x-4")} />
          </span>
          In stock only
        </Link>
        <Link
          href={href({ onSale: !q.onSale })}
          scroll={false}
          role="checkbox"
          aria-checked={q.onSale}
          className="flex items-center gap-2.5 rounded-control px-1 py-1 text-sm font-semibold hover:bg-cloud"
        >
          <span
            aria-hidden
            className={clsx("h-5 w-9 rounded-full p-0.5 transition-colors", q.onSale ? "bg-cobalt" : "bg-mist")}
          >
            <span className={clsx("block size-4 rounded-full bg-white transition-transform", q.onSale && "translate-x-4")} />
          </span>
          On sale
        </Link>
      </div>
      {!omitCategory && (
        <FacetGroup
          title="Category"
          values={result.facets.category}
          isOn={(v) => q.category === v}
          hrefFor={(v) => href({ category: q.category === v ? "" : v })}
        />
      )}
      <SizeFacet values={result.facets.size} q={q} href={href} theme={theme} />
      <FacetGroup
        title="Brand"
        values={[...result.facets.brand].sort((a, b) => a.label.localeCompare(b.label))}
        isOn={(v) => q.brand.includes(v)}
        hrefFor={(v) => href({ brand: toggle(q.brand, v) })}
      />
      <FacetGroup
        title={labels.color}
        values={result.facets.color}
        isOn={(v) => q.color.includes(v)}
        hrefFor={(v) => href({ color: toggle(q.color, v) })}
        render={(v) => {
          const sw = swatchFor(v.value) ?? swatchFor(v.label);
          return (
            <span className="inline-flex items-center gap-2">
              {sw && <span aria-hidden className="size-3.5 rounded-full border border-ink/20" style={{ background: sw }} />}
              {v.label}
            </span>
          );
        }}
      />
      <form action={base} method="get" className="border-t border-mist py-4">
        <p className="mb-2 text-sm font-semibold">Price</p>
        {q.q && <input type="hidden" name="q" value={q.q} />}
        {!omitCategory && q.category && <input type="hidden" name="category" value={q.category} />}
        {q.brand.map((b) => (
          <input key={`b-${b}`} type="hidden" name="brand" value={b} />
        ))}
        {q.size.map((s) => (
          <input key={`s-${s}`} type="hidden" name="size" value={s} />
        ))}
        {q.color.map((c) => (
          <input key={`c-${c}`} type="hidden" name="color" value={c} />
        ))}
        {q.inStock && <input type="hidden" name="inStock" value="true" />}
        {q.onSale && <input type="hidden" name="onSale" value="true" />}
        {q.sort && <input type="hidden" name="sort" value={q.sort} />}
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="price-min">
            Minimum price
          </label>
          <input
            id="price-min"
            name="min"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Min"
            defaultValue={q.min}
            className="field py-1.5 text-sm"
          />
          <span aria-hidden className="text-ink-faint">
            –
          </span>
          <label className="sr-only" htmlFor="price-max">
            Maximum price
          </label>
          <input
            id="price-max"
            name="max"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Max"
            defaultValue={q.max}
            className="field py-1.5 text-sm"
          />
          <button type="submit" className="btn btn-quiet btn-sm">
            Apply
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-10">
      <aside aria-label="Filters">
        <details className="group rounded-control border border-mist bg-white p-3 lg:hidden">
          <summary className="cursor-pointer list-none font-semibold">
            Filters{chips.length > 0 && <span className="text-ink-soft"> ({chips.length} on)</span>}
          </summary>
          <div className="mt-3">{filters}</div>
        </details>
        <div className="hidden lg:block">{filters}</div>
      </aside>

      <section aria-label="Results">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="tabular text-ink-soft" aria-live="polite">
            {pluralize(result.totalItems, labels.noun[0], labels.noun[1])}
          </p>
          <SortSelect value={sortValue} options={sortOptions} />
        </div>

        {chips.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <Link
                key={c.label + c.href}
                href={c.href}
                scroll={false}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-sm text-paper hover:opacity-90"
              >
                {c.label}
                <span aria-hidden>×</span>
                <span className="sr-only">(remove filter)</span>
              </Link>
            ))}
            {hasActiveFilters(q, omitCategory) && (
              <Link
                href={searchHref(base, { ...q, brand: [], size: [], color: [], min: "", max: "", inStock: false, onSale: false, category: omitCategory ? q.category : "" }, {}, omitCategory)}
                className="text-sm font-semibold text-cobalt hover:underline"
              >
                Clear filters
              </Link>
            )}
          </div>
        )}

        {result.items.length === 0 ? (
          <EmptyState
            title={q.q ? `${copy.noResults} “${q.q}”` : `${copy.noResults} these filters`}
            action={{ href: base, label: omitCategory ? "Show the whole category" : `Show ${labels.allProducts.toLowerCase()}` }}
          >
            {copy.noResultsHint}
          </EmptyState>
        ) : (
          <ProductGrid products={result.items} />
        )}

        <Pagination page={q.page} totalPages={result.totalPages} hrefFor={(p) => href({ page: p })} />
      </section>
    </div>
  );
}
