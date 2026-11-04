import Link from "next/link";
import { connection } from "next/server";
import { ProductGrid } from "@/components/product-card";
import { SizeStrip } from "@/components/size-strip";
import { Container, ServiceDown } from "@/components/ui";
import { getCategories, searchProducts } from "@/lib/data";
import { parseSearchParams } from "@/lib/search";
import type { Category, ProductSummary } from "@/lib/types";

async function loadHome(): Promise<{
  categories: Category[];
  latest: ProductSummary[];
  onSale: ProductSummary[];
} | null> {
  try {
    const base = parseSearchParams({});
    const [categories, latest, onSale] = await Promise.all([
      getCategories(),
      searchProducts({ ...base, sort: "newest" }, 8),
      searchProducts({ ...base, onSale: true, inStock: true, sort: "newest" }, 4),
    ]);
    return { categories, latest: latest.items, onSale: onSale.items };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  // Rendered per request: the catalog lives in the API, which isn't available at build time.
  await connection();
  const data = await loadHome();
  const newArrivals = data?.latest ?? [];
  const onSale = data?.onSale ?? [];

  return (
    <>
      <section className="border-b border-mist">
        <Container className="grid items-end gap-10 py-10 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
          <div>
            <h1 className="headline text-[3.4rem] leading-[0.88] sm:text-[5rem] lg:text-[6.25rem]">
              Shoes in your size, ready to ship.
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink-soft">
              Pick your EU size to see every pair we have in stock, or search by brand and style.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/search?sort=newest" className="btn btn-ink">
                See new arrivals
              </Link>
              <Link href="/search" className="btn btn-quiet">
                Browse all shoes
              </Link>
            </div>
          </div>
          <SizeStrip />
        </Container>
      </section>

      {!data && (
        <Container className="mt-10">
          <ServiceDown what="the catalog" />
        </Container>
      )}

      {data && data.categories.length > 0 && (
        <Container className="mt-14">
          <h2 className="headline text-2xl">Shop by category</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {data.categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  className="group flex h-28 flex-col justify-between rounded-tag bg-cloud p-4 transition-colors hover:bg-ink hover:text-paper sm:h-36"
                >
                  <span className="headline text-[1.9rem] leading-none">{c.name}</span>
                  {c.children.length > 0 && (
                    <span className="text-sm text-ink-soft group-hover:text-paper/70">
                      {c.children
                        .slice(0, 3)
                        .map((ch) => ch.name)
                        .join(", ")}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      {newArrivals.length > 0 && (
        <Container className="mt-16">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="headline text-2xl">New arrivals</h2>
            <Link href="/search?sort=newest" className="text-sm font-semibold text-cobalt hover:underline">
              See all new arrivals
            </Link>
          </div>
          <ProductGrid products={newArrivals} />
        </Container>
      )}

      {onSale.length > 0 && (
        <Container className="mt-16">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="headline text-2xl">On sale</h2>
            <Link href="/search?onSale=true" className="text-sm font-semibold text-cobalt hover:underline">
              See everything on sale
            </Link>
          </div>
          <ProductGrid products={onSale} />
        </Container>
      )}

      {data && newArrivals.length === 0 && (
        <Container className="mt-14">
          <p className="text-ink-soft">The catalog is empty. Add products in the admin area to see them here.</p>
        </Container>
      )}
    </>
  );
}
