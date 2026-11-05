import Link from "next/link";
import { Container } from "@/components/ui";
import { EmptyCatalog, ProductSection } from "./sections";
import type { HomeProps } from "./types";

// Simple line icons for the aisle tiles, matched on words in the category slug.
const ICONS: { match: RegExp; path: string }[] = [
  { match: /fruit|veg|produce/, path: "M12 7c0-2 1-3.5 3-4M7.5 8.5C4 9 3 13 4.5 16.5S9 21 12 19.5c3 1.5 6 .5 7.5-3S20 9 16.5 8.5c-1.6-.2-3 .5-4.5.5s-2.9-.7-4.5-.5z" },
  { match: /bake|bread/, path: "M5 11a4 4 0 0 1 3-6h8a4 4 0 0 1 3 6v8H5zM9 11v8M15 11v8" },
  { match: /dairy|milk|egg|cheese/, path: "M9 3h6l1 4v13H8V7zM8 11h8" },
  { match: /pantry|cupboard|jar/, path: "M8 3h8v3H8zM7 6h10l1 3v11H6V9zM9 13h6" },
  { match: /drink|coffee|tea|soft/, path: "M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M11 2v3M14 3v2" },
  { match: /meat|fish/, path: "M4 12c3-5 10-6 15-2l2-2v8l-2-2c-5 4-12 3-15-2z" },
  { match: /frozen|ice/, path: "M12 2v20M4 7l16 10M20 7 4 17" },
];
const BASKET = "M4 9h16l-2 11H6zM8 9l3-6M16 9l-3-6M9 13v3M15 13v3";

function iconFor(slug: string): string {
  return ICONS.find((i) => i.match.test(slug))?.path ?? BASKET;
}

/** A friendly market: big search, aisle tiles, deals first, then a dense grid with quick add. */
export function GroceryHome({ data, theme }: HomeProps) {
  const { copy, labels } = theme;
  return (
    <>
      <section className="bg-cobalt pb-10 text-white">
        <Container className="pt-6 sm:pt-10">
          <div className="relative overflow-hidden rounded-tag bg-cobalt-deep px-5 py-8 sm:px-10 sm:py-12">
            <div aria-hidden className="absolute -right-10 -top-16 size-64 rounded-full bg-sticker/90" />
            <div aria-hidden className="absolute -bottom-20 right-24 size-40 rounded-full bg-white/10" />
            <div className="relative max-w-2xl">
              <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-bold">{copy.heroEyebrow}</p>
              <h1 className="headline mt-4 text-[2.6rem] leading-[1.02] sm:text-6xl">{copy.heroTitle}</h1>
              <p className="mt-3 text-lg text-white/85">{copy.heroSub}</p>
              <form action="/search" method="get" role="search" className="mt-6 flex max-w-xl gap-2">
                <label htmlFor="q-hero" className="sr-only">
                  {labels.searchLabel}
                </label>
                <input
                  id="q-hero"
                  name="q"
                  type="search"
                  placeholder={labels.searchPlaceholder}
                  className="field flex-1 rounded-full border-transparent py-3.5 pl-5 text-base"
                />
                <button type="submit" className="btn rounded-full bg-sticker px-5 font-extrabold text-ink hover:brightness-95">
                  Search
                </button>
              </form>
            </div>
          </div>
        </Container>
      </section>

      {data.categories.length > 0 && (
        <Container className="mt-10">
          <h2 className="headline text-2xl">{copy.categoriesTitle}</h2>
          <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {data.categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  className="flex h-full flex-col items-center gap-2 rounded-tag bg-white px-2 py-4 text-center ring-1 ring-mist transition hover:-translate-y-0.5 hover:ring-cobalt"
                >
                  <span className="flex size-14 items-center justify-center rounded-full bg-sticker/40 text-cobalt-deep">
                    <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d={iconFor(c.slug)} />
                    </svg>
                  </span>
                  <span className="text-sm font-bold leading-tight">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      <ProductSection
        title={copy.saleTitle}
        link={copy.saleLink}
        href="/search?onSale=true"
        products={data.onSale.slice(0, 6)}
        className="mt-12"
      />
      <ProductSection
        title={copy.newTitle}
        link={copy.newLink}
        href="/search?sort=newest"
        products={data.latest.slice(0, 12)}
        className="mt-12"
      />
      {data.latest.length === 0 && <EmptyCatalog text={copy.emptyCatalog} />}
    </>
  );
}
