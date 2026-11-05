import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { CompareClear, CompareRemove } from "@/components/compare";
import { CompareView } from "@/components/compare-view";
import { DealCountdown } from "@/components/deal-countdown";
import { Container, EmptyState, PageTitle, Price, ProductImage, ServiceDown } from "@/components/ui";
import { COMPARE_COOKIE, parseCompare } from "@/lib/compare";
import { buildCompareRows } from "@/lib/compare-rows";
import { getProduct } from "@/lib/data";
import type { ProductDetail } from "@/lib/types";

export const metadata: Metadata = { title: "Compare products", robots: { index: false } };

export default async function ComparePage() {
  const slugs = parseCompare((await cookies()).get(COMPARE_COOKIE)?.value);

  let products: ProductDetail[];
  try {
    products = (await Promise.all(slugs.map((s) => getProduct(s)))).filter((p): p is ProductDetail => p !== null);
  } catch {
    return (
      <Container className="py-10">
        <PageTitle>Compare products</PageTitle>
        <ServiceDown what="the comparison" />
      </Container>
    );
  }

  if (products.length === 0) {
    return (
      <Container className="py-10">
        <PageTitle>Compare products</PageTitle>
        <EmptyState title="Nothing to compare yet" action={{ href: "/search", label: "Browse products" }}>
          Tick “Compare” on up to four products to see their specifications side by side.
        </EmptyState>
      </Container>
    );
  }

  const groups = buildCompareRows(products.map((p) => p.specs ?? []));
  const anySpecs = groups.length > 0;
  const cell = "border-t border-mist px-4 py-3 align-top";
  const labelCell = clsxSticky("border-t border-mist px-4 py-3 text-left align-top text-sm font-medium text-ink-soft");

  return (
    <Container className="py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle sub={`${products.length} of 4 products`}>Compare products</PageTitle>
        <CompareClear />
      </div>

      <CompareView canFilter={anySpecs && products.length > 1}>
        {/* The table scrolls sideways inside its box on narrow screens; the page never does. */}
        <div className="max-w-full overflow-x-auto rounded-tag border border-mist bg-white">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="sr-only">Specifications of the compared products</caption>
            <thead>
              <tr>
                <td className={clsxSticky("w-44 px-4 py-4")} />
                {products.map((p) => (
                  <th key={p.id} scope="col" className="min-w-48 px-4 py-4 text-left align-top font-normal">
                    <Link href={`/p/${p.slug}`} className="group block">
                      <div className="relative aspect-square w-full max-w-40 overflow-hidden rounded-control bg-cloud">
                        <ProductImage src={p.images[0]?.url ?? null} alt={p.name} name={p.name} sizes="sm" />
                      </div>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">{p.brand.name}</p>
                      <p className="font-semibold leading-snug group-hover:text-cobalt">{p.name}</p>
                    </Link>
                    <Price price={p.price} compareAt={p.compareAtPrice} from={p.variants.length > 1} className="mt-2" />
                    {p.deal && <DealCountdown endsAt={p.deal.endsAt} tone="strong" className="mt-1" />}
                    <p className={p.inStock ? "mt-1 text-xs text-ink-soft" : "mt-1 text-xs font-semibold text-signal"}>
                      {p.inStock ? "In stock" : "Sold out"}
                    </p>
                    <div className="mt-3">
                      <CompareRemove slug={p.slug} name={p.name} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.group}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={products.length + 1}
                    className="border-t border-mist bg-cloud px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink-soft"
                  >
                    {g.group}
                  </th>
                </tr>
                {g.rows.map((row) => (
                  <tr key={row.key} data-same={row.same ? "true" : undefined} className="compare-row">
                    <th scope="row" className={labelCell}>
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td key={products[i].id} className={cell}>
                        {v ?? <span className="text-ink-faint">–</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        {!anySpecs && (
          <p className="mt-4 text-sm text-ink-soft">These products have no specifications to compare yet.</p>
        )}
      </CompareView>
    </Container>
  );
}

function clsxSticky(base: string): string {
  return `${base} sticky left-0 z-10 bg-white`;
}
