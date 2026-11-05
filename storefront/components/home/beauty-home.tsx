import Link from "next/link";
import { Container, ProductImage } from "@/components/ui";
import type { Category } from "@/lib/types";
import { EmptyCatalog, ProductSection } from "./sections";
import type { HomeProps } from "./types";

const ROUTINE = [
  { step: "Cleanse", slug: "cleansers", text: "A gentle start" },
  { step: "Treat", slug: "serums", text: "Targeted serums" },
  { step: "Moisturise", slug: "moisturisers", text: "Seal it in" },
];

function flatten(categories: Category[]): Category[] {
  return categories.flatMap((c) => [c, ...flatten(c.children)]);
}

/** Soft and centred: serif hero, category circles, a three-step routine and bestsellers. */
export function BeautyHome({ data, theme }: HomeProps) {
  const { copy } = theme;
  const all = flatten(data.categories);
  const routine = ROUTINE.filter((r) => all.some((c) => c.slug === r.slug));
  const hero = data.latest[0];

  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-x-0 top-0 h-[85%] bg-gradient-to-b from-sticker/70 to-paper" />
        <Container className="relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-cobalt">{copy.heroEyebrow}</p>
            <h1 className="headline mt-5 text-[3.2rem] leading-[0.98] sm:text-[4.8rem]">{copy.heroTitle}</h1>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-ink-soft lg:mx-0">{copy.heroSub}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link href="/search?sort=newest" className="btn btn-primary px-6">
                {copy.primaryCta}
              </Link>
              {routine.length > 0 && (
                <Link href="#routine" className="btn btn-quiet bg-white/60 px-6">
                  {copy.secondaryCta}
                </Link>
              )}
            </div>
          </div>
          {hero && (
            <Link
              href={`/p/${hero.slug}`}
              aria-label={hero.name}
              className="mx-auto block aspect-[4/5] w-full max-w-md overflow-hidden rounded-[999px_999px_var(--radius-tag)_var(--radius-tag)] bg-white shadow-[0_30px_60px_-30px_rgba(59,35,49,0.35)]"
            >
              <ProductImage src={hero.imageUrl} alt={hero.name} name={hero.name} sizes="lg" />
            </Link>
          )}
        </Container>
      </section>

      {data.categories.length > 0 && (
        <Container className="mt-6">
          <h2 className="sr-only">{copy.categoriesTitle}</h2>
          <ul className="flex justify-start gap-5 overflow-x-auto pb-2 sm:justify-center sm:gap-8">
            {all.filter((c) => c.children.length === 0).slice(0, 8).map((c) => (
              <li key={c.id} className="shrink-0">
                <Link href={`/c/${c.slug}`} className="group flex w-20 flex-col items-center gap-2 text-center sm:w-24">
                  <span className="headline flex size-20 items-center justify-center rounded-full bg-white text-3xl text-cobalt ring-1 ring-mist transition group-hover:bg-sticker group-hover:ring-cobalt sm:size-24">
                    {c.name.slice(0, 1)}
                  </span>
                  <span className="text-sm text-ink-soft group-hover:text-ink">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      {routine.length > 0 && (
        <section id="routine" className="mt-16 scroll-mt-6">
          <Container>
            <div className="rounded-tag bg-white px-5 py-10 text-center ring-1 ring-mist sm:px-10">
              <h2 className="headline text-[2.4rem]">Your routine</h2>
              <ol className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
                {routine.map((r, i) => (
                  <li key={r.slug}>
                    <Link href={`/c/${r.slug}`} className="group block rounded-tag bg-paper px-4 py-6 transition hover:bg-sticker/60">
                      <span className="tabular text-xs text-ink-faint">Step {i + 1}</span>
                      <span className="headline mt-1 block text-[1.8rem] leading-none group-hover:text-cobalt">{r.step}</span>
                      <span className="mt-2 block text-sm text-ink-soft">{r.text}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </section>
      )}

      <ProductSection
        title={copy.newTitle}
        link={copy.newLink}
        href="/search?sort=newest"
        products={data.latest.slice(0, 8)}
        titleClassName="headline text-[2.4rem]"
      />
      <ProductSection
        title={copy.saleTitle}
        link={copy.saleLink}
        href="/search?onSale=true"
        products={data.onSale.slice(0, 4)}
        titleClassName="headline text-[2.4rem]"
      />
      {data.latest.length === 0 && <EmptyCatalog text={copy.emptyCatalog} />}
    </>
  );
}
