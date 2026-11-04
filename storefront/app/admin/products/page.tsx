import type { Metadata } from "next";
import Link from "next/link";
import { AdminTitle, FilterTabs, td, th } from "@/components/admin/bits";
import { Pagination } from "@/components/pagination";
import { Notice, Price, ProductImage } from "@/components/ui";
import { getAdminProducts } from "@/lib/data";
import { formatDate, PRODUCT_STATUS_LABEL } from "@/lib/format";
import type { ProductStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Products" };

type Props = { searchParams: Promise<{ q?: string; status?: string; page?: string; archived?: string }> };

const STATUSES: ProductStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED"];

function hrefWith(params: { q?: string; status?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `/admin/products?${s}` : "/admin/products";
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = STATUSES.includes(sp.status as ProductStatus) ? (sp.status as ProductStatus) : "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const result = await getAdminProducts({ q, status, page: page - 1 });

  return (
    <>
      <AdminTitle
        sub={`${result.totalItems} products`}
        actions={
          <Link href="/admin/products/new" className="btn btn-primary">
            New product
          </Link>
        }
      >
        Products
      </AdminTitle>

      {sp.archived && <Notice tone="success" className="mb-5" title="Product archived. It no longer appears in the shop." />}

      <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <FilterTabs
          items={[
            { label: "All", href: hrefWith({ q }), active: !status },
            ...STATUSES.map((s) => ({ label: PRODUCT_STATUS_LABEL[s], href: hrefWith({ q, status: s }), active: status === s })),
          ]}
        />
        <form action="/admin/products" method="get" role="search" className="mb-5 flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="admin-q" className="sr-only">
            Search products
          </label>
          <input id="admin-q" name="q" type="search" defaultValue={q} placeholder="Name, brand or SKU" className="field w-64 py-1.5" />
          <button type="submit" className="btn btn-quiet btn-sm">
            Search
          </button>
        </form>
      </div>

      {result.items.length === 0 ? (
        <p className="rounded-tag bg-white p-6 text-ink-soft">
          {q || status ? "No products match. Clear the search or pick another status." : "No products yet. Create the first one."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-tag bg-white">
          <table className="tabular w-full min-w-[44rem] text-sm">
            <thead className="border-b border-mist">
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Status</th>
                <th className={th}>Price</th>
                <th className={`${th} text-right`}>Available</th>
                <th className={`${th} text-right`}>Variants</th>
                <th className={th}>Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {result.items.map((p) => (
                <tr key={p.id} className="hover:bg-paper/60">
                  <td className={td}>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <span className="block size-11 shrink-0 overflow-hidden rounded-tag bg-cloud">
                        <ProductImage src={p.imageUrl} alt="" name={p.name} sizes="sm" />
                      </span>
                      <span>
                        <span className="font-semibold hover:underline">{p.name}</span>
                        <span className="block text-xs text-ink-faint">{p.brand.name}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={td}>
                    <span
                      className={
                        p.status === "ACTIVE"
                          ? "font-semibold text-moss"
                          : p.status === "DRAFT"
                            ? "font-semibold text-ink-soft"
                            : "text-ink-faint"
                      }
                    >
                      {PRODUCT_STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className={td}>{p.price ? <Price price={p.price} /> : <span className="text-ink-faint">No variants</span>}</td>
                  <td className={`${td} text-right ${p.totalAvailable === 0 ? "font-semibold text-signal" : ""}`}>
                    {p.totalAvailable}
                  </td>
                  <td className={`${td} text-right`}>{p.variantCount}</td>
                  <td className={`${td} text-ink-soft`}>{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={result.totalPages} hrefFor={(p) => hrefWith({ q, status, page: p })} />
    </>
  );
}
