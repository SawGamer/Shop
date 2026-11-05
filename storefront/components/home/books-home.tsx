import clsx from "clsx";
import Link from "next/link";
import { Container, Price, ProductImage } from "@/components/ui";
import { EmptyCatalog, ProductSection } from "./sections";
import type { HomeProps } from "./types";

// Spine colours for the genre shelf, taken from the design tokens.
const SPINES = [
  "bg-ink text-paper",
  "bg-cobalt text-white",
  "bg-moss text-white",
  "bg-sticker text-ink",
  "bg-ink-soft text-paper",
  "bg-cobalt-deep text-white",
];
const SPINE_HEIGHT = ["h-32", "h-28", "h-36", "h-30", "h-34", "h-28"];

/** Ink-blue front table with three fanned covers, a shelf of genre spines, then rows of titles. */
export function BooksHome({ data, theme }: HomeProps) {
  const { copy } = theme;
  const covers = data.latest.slice(0, 3);
  const rest = data.latest.slice(3);
  const tilt = ["-rotate-6 translate-y-3", "z-10 scale-105", "rotate-6 translate-y-3"];

  return (
    <>
      <section className="bg-ink text-paper">
        <Container className="grid items-center gap-10 py-12 lg:grid-cols-[1fr_1fr] lg:py-16">
          <div>
            <p className="text-base text-sticker">{copy.heroEyebrow}</p>
            <h1 className="headline mt-3 max-w-xl text-[2.6rem] leading-[1.05] sm:text-6xl">{copy.heroTitle}</h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-paper/75">{copy.heroSub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/search?sort=newest" className="btn bg-sticker text-ink hover:brightness-95">
                {copy.primaryCta}
              </Link>
              <Link href="/search" className="btn border border-paper/35 text-paper hover:bg-white/10">
                {copy.secondaryCta}
              </Link>
            </div>
          </div>
          {covers.length > 0 && (
            <ul className="flex items-center justify-center gap-0 pb-4" aria-label="On the front table">
              {covers.map((p, i) => (
                <li key={p.id} className={clsx("relative -mx-3 w-[36%] max-w-52 transition-transform hover:z-20 hover:-translate-y-2", tilt[i])}>
                  <Link href={`/p/${p.slug}`} aria-label={`${p.name}, ${p.brand.name}`} className="block">
                    <div className="aspect-[2/3] overflow-hidden rounded-r-[3px] bg-cloud shadow-[0_18px_30px_-10px_rgba(0,0,0,0.6)]">
                      <ProductImage src={p.imageUrl} alt={p.name} name={p.name} sizes="lg" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
        {covers[0] && (
          <Container className="pb-5 text-sm text-paper/70">
            <Link href={`/p/${covers[0].slug}`} className="hover:text-paper hover:underline">
              Featured: {covers[0].name}
            </Link>{" "}
            <Price price={covers[0].price} from={covers[0].sizes.length > 1} className="text-paper [&>span]:font-normal" />
          </Container>
        )}
      </section>

      {data.categories.length > 0 && (
        <Container className="mt-14">
          <h2 className="headline text-3xl">{copy.categoriesTitle}</h2>
          <ul className="mt-5 flex flex-wrap items-end gap-1 border-b-[10px] border-[color-mix(in_srgb,var(--color-ink)_80%,var(--color-paper))]">
            {data.categories.slice(0, 6).map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  className={clsx(
                    "headline flex min-w-28 flex-col justify-between rounded-t-[3px] px-4 pb-3 pt-4 text-xl leading-tight transition-transform hover:-translate-y-1.5",
                    SPINES[i % SPINES.length],
                    SPINE_HEIGHT[i % SPINE_HEIGHT.length],
                  )}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      <ProductSection title={copy.newTitle} link={copy.newLink} href="/search?sort=newest" products={rest.slice(0, 10)} titleClassName="headline text-3xl" />
      <ProductSection title={copy.saleTitle} link={copy.saleLink} href="/search?onSale=true" products={data.onSale.slice(0, 5)} titleClassName="headline text-3xl" />
      {data.latest.length === 0 && <EmptyCatalog text={copy.emptyCatalog} />}
    </>
  );
}
