import Link from "next/link";
import { DealCountdown } from "@/components/deal-countdown";
import { ProductGrid } from "@/components/product-card";
import { Container, Price, ProductImage } from "@/components/ui";
import { compareSizes } from "@/lib/colors";
import { EmptyCatalog, ProductSection } from "./sections";
import type { HomeProps } from "./types";

const TRUST = [
  { title: "Free shipping over €50", text: "Delivered in 1–2 working days", icon: "M3 7h11v8H3zM14 10h4l3 3v2h-7zM6.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" },
  { title: "Secure checkout", text: "Card details never touch our servers", icon: "M6 10V8a6 6 0 1 1 12 0v2M5 10h14v10H5zM12 14v2" },
  { title: "Easy returns", text: "30 days to change your mind", icon: "M4 12a8 8 0 1 0 3-6.2M4 4v4h4" },
];

/** Graphite spotlight on the newest product, a trust strip, then dense spec cards. */
export function ElectronicsHome({ data, theme }: HomeProps) {
  const { copy } = theme;
  const [spotlight, ...rest] = data.latest;
  const capacities = spotlight ? [...spotlight.sizes].sort(compareSizes) : [];

  return (
    <>
      <section className="bg-ink text-white">
        <Container className="grid items-center gap-10 py-12 lg:grid-cols-[1fr_1.1fr] lg:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--color-cobalt)_45%,white)]">{copy.heroEyebrow}</p>
            {spotlight ? (
              <>
                <h1 className="headline mt-3 text-[2.75rem] leading-[1] sm:text-6xl">{spotlight.name}</h1>
                <p className="mt-3 text-white/60">{spotlight.brand.name}</p>
                {capacities.length > 0 && (
                  <ul className="mt-6 flex flex-wrap gap-2" aria-label="Available capacities">
                    {capacities.map((s) => (
                      <li key={s} className="tabular rounded-full border border-white/25 px-3 py-1 text-sm">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
                <Price
                  price={spotlight.price}
                  compareAt={spotlight.compareAtPrice}
                  from={capacities.length > 1}
                  className="mt-6 text-2xl [&_s]:text-white/50 [&_span]:text-white"
                />
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={`/p/${spotlight.slug}`} className="btn btn-primary">
                    {copy.primaryCta}
                  </Link>
                  <Link href="/search" className="btn border border-white/25 text-white hover:bg-white/10">
                    {copy.secondaryCta}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 className="headline mt-3 text-5xl leading-[1]">{copy.heroTitle}</h1>
                <p className="mt-4 max-w-md text-white/70">{copy.heroSub}</p>
              </>
            )}
          </div>
          {spotlight && (
            <Link
              href={`/p/${spotlight.slug}`}
              className="relative aspect-[4/3] overflow-hidden rounded-tag bg-white shadow-[0_30px_80px_-30px_rgba(31,92,255,0.6)]"
              aria-label={spotlight.name}
            >
              <ProductImage src={spotlight.imageUrl} alt={spotlight.name} name={spotlight.name} sizes="lg" />
            </Link>
          )}
        </Container>
      </section>

      <section aria-label="Why shop with us" className="border-b border-mist bg-white">
        <Container className="grid gap-4 py-5 sm:grid-cols-3">
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cobalt/10 text-cobalt">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={t.icon} />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="text-xs text-ink-soft">{t.text}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>

      {data.deals.length > 0 && (
        <section aria-labelledby="deals-title" className="bg-[color-mix(in_srgb,var(--color-signal)_7%,var(--color-paper))] py-10">
          <Container>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal">Limited time</p>
                <h2 id="deals-title" className="headline mt-1 text-3xl">
                  Deals of the day
                </h2>
                {data.deals[0]?.dealEndsAt && (
                  <DealCountdown
                    endsAt={data.deals[0].dealEndsAt}
                    label="Next deal ends in"
                    tone="strong"
                    className="mt-2 text-sm"
                  />
                )}
              </div>
              <Link href="/search?deal=true&sort=deal_ending" className="text-sm font-semibold text-cobalt hover:underline">
                All deals
              </Link>
            </div>
            <ProductGrid products={data.deals.slice(0, 4)} />
          </Container>
        </section>
      )}

      {data.categories.length > 0 && (
        <Container className="mt-12">
          <h2 className="headline text-2xl">{copy.categoriesTitle}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {data.categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-mist bg-white px-4 py-2 text-sm font-semibold hover:border-cobalt hover:text-cobalt"
                >
                  {c.name}
                  {c.children.length > 0 && <span className="text-xs font-normal text-ink-faint">{c.children.length}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      <ProductSection title={copy.newTitle} link={copy.newLink} href="/search?sort=newest" products={rest.slice(0, 8)} />
      {data.deals.length === 0 && (
        <ProductSection title={copy.saleTitle} link={copy.saleLink} href="/search?onSale=true" products={data.onSale.slice(0, 4)} />
      )}
      {data.latest.length === 0 && <EmptyCatalog text={copy.emptyCatalog} />}
    </>
  );
}
