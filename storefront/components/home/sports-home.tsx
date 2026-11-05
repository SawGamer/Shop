import Link from "next/link";
import { DealCountdown } from "@/components/deal-countdown";
import { ProductGrid } from "@/components/product-card";
import { Container, Price, ProductImage } from "@/components/ui";
import { EmptyCatalog, ProductSection } from "./sections";
import type { HomeProps } from "./types";

/** Charcoal hero cut on the diagonal with a spotlight product, activity tiles, then dense gear grids. */
export function SportsHome({ data, theme }: HomeProps) {
  const { copy } = theme;
  const [spotlight, ...rest] = data.latest;
  const multi = (spotlight?.sizes.length ?? 0) > 1;

  return (
    <>
      <section className="bg-ink text-white [clip-path:polygon(0_0,100%_0,100%_93%,0_100%)]">
        <Container className="grid items-center gap-8 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-14">
          <div>
            <p className="inline-block bg-sticker px-2.5 py-0.5 text-sm font-semibold text-ink">{copy.heroEyebrow}</p>
            <h1 className="headline mt-4 text-[3.4rem] leading-[0.92] sm:text-[5.5rem]">{copy.heroTitle}</h1>
            <p className="mt-4 max-w-md text-lg text-white/70">{copy.heroSub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={spotlight ? `/p/${spotlight.slug}` : "/search"} className="btn btn-primary">
                {copy.primaryCta}
              </Link>
              <Link href="/search" className="btn border border-white/30 text-white hover:bg-white/10">
                {copy.secondaryCta}
              </Link>
            </div>
          </div>
          {spotlight && (
            <Link
              href={`/p/${spotlight.slug}`}
              aria-label={spotlight.name}
              className="group relative mx-auto block w-full max-w-md"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-cloud [clip-path:polygon(14%_0,100%_0,100%_100%,0_100%)]">
                <ProductImage src={spotlight.imageUrl} alt={spotlight.name} name={spotlight.name} sizes="lg" className="transition-transform duration-500 group-hover:scale-[1.04]" />
              </div>
              <div className="absolute bottom-0 left-0 max-w-[75%] bg-sticker px-4 py-3 text-ink">
                <p className="headline text-2xl leading-none">{spotlight.name}</p>
                <Price price={spotlight.price} compareAt={spotlight.compareAtPrice} from={multi} className="mt-1 text-base" />
              </div>
            </Link>
          )}
        </Container>
      </section>

      {data.categories.length > 0 && (
        <Container className="mt-4">
          <h2 className="headline text-3xl">{copy.categoriesTitle}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {data.categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  className="flex h-full min-h-32 flex-col justify-between border-t-4 border-sticker bg-ink p-3 text-white transition-colors hover:bg-cobalt"
                >
                  <span className="headline text-[1.6rem] leading-none">{c.name}</span>
                  {c.children.length > 0 && (
                    <span className="mt-4 text-xs text-white/65">{c.children.slice(0, 3).map((k) => k.name).join(", ")}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      {data.deals.length > 0 && (
        <Container className="mt-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="headline text-3xl">Deals ending soon</h2>
              {data.deals[0]?.dealEndsAt && (
                <DealCountdown endsAt={data.deals[0].dealEndsAt} label="Next deal ends in" tone="strong" className="mt-1 text-sm" />
              )}
            </div>
            <Link href="/search?deal=true&sort=deal_ending" className="text-sm font-semibold text-cobalt hover:underline">
              All deals
            </Link>
          </div>
          <ProductGrid products={data.deals.slice(0, 4)} />
        </Container>
      )}

      <ProductSection title={copy.newTitle} link={copy.newLink} href="/search?sort=newest" products={rest.slice(0, 8)} titleClassName="headline text-3xl" />
      {data.deals.length === 0 && (
        <ProductSection title={copy.saleTitle} link={copy.saleLink} href="/search?onSale=true" products={data.onSale.slice(0, 4)} titleClassName="headline text-3xl" />
      )}
      {data.latest.length === 0 && <EmptyCatalog text={copy.emptyCatalog} />}
    </>
  );
}
