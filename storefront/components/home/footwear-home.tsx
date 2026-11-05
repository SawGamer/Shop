import Link from "next/link";
import { SizeStrip } from "@/components/size-strip";
import { Container } from "@/components/ui";
import { EmptyCatalog, ProductSection } from "./sections";
import type { HomeProps } from "./types";

/** The original Z&A shoe shop home: big condensed headline, shoe-box size strip, category tiles. */
export function FootwearHome({ data, theme }: HomeProps) {
  const { copy } = theme;
  return (
    <>
      <section className="border-b border-mist">
        <Container className="grid items-end gap-10 py-10 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
          <div>
            <h1 className="headline text-[3.4rem] leading-[0.88] sm:text-[5rem] lg:text-[6.25rem]">{copy.heroTitle}</h1>
            <p className="mt-6 max-w-md text-lg text-ink-soft">{copy.heroSub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/search?sort=newest" className="btn btn-ink">
                {copy.primaryCta}
              </Link>
              <Link href="/search" className="btn btn-quiet">
                {copy.secondaryCta}
              </Link>
            </div>
          </div>
          <SizeStrip />
        </Container>
      </section>

      {data.categories.length > 0 && (
        <Container className="mt-14">
          <h2 className="headline text-2xl">{copy.categoriesTitle}</h2>
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

      <ProductSection title={copy.newTitle} link={copy.newLink} href="/search?sort=newest" products={data.latest.slice(0, 8)} />
      <ProductSection title={copy.saleTitle} link={copy.saleLink} href="/search?onSale=true" products={data.onSale.slice(0, 4)} />
      {data.latest.length === 0 && <EmptyCatalog text={copy.emptyCatalog} />}
    </>
  );
}
