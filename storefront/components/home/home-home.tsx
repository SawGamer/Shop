import Link from "next/link";
import { Container, ProductImage } from "@/components/ui";
import { EmptyCatalog, ProductSection } from "./sections";
import type { HomeProps } from "./types";

/** Editorial: asymmetric image collage, serif headline, rooms as large tiles, portrait cards. */
export function HomeHome({ data, theme }: HomeProps) {
  const { copy } = theme;
  const [a, b, c] = data.latest;
  const rooms = data.categories.slice(0, 5);

  return (
    <>
      <section>
        <Container className="grid gap-6 pt-8 sm:pt-12 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col justify-end lg:col-span-4 lg:pb-10">
            <p className="text-xs uppercase tracking-[0.22em] text-ink-soft">{copy.heroEyebrow}</p>
            <h1 className="headline mt-4 text-[3rem] leading-[1.02] sm:text-[4.25rem]">{copy.heroTitle}</h1>
            <p className="mt-5 max-w-sm leading-relaxed text-ink-soft">{copy.heroSub}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/search?sort=newest" className="btn btn-ink">
                {copy.primaryCta}
              </Link>
              <Link href="#rooms" className="btn px-0 underline underline-offset-4 hover:text-cobalt">
                {copy.secondaryCta}
              </Link>
            </div>
          </div>
          {a && (
            <div className="grid grid-cols-5 gap-3 sm:gap-5 lg:col-span-8">
              <Link href={`/p/${a.slug}`} className="col-span-3 row-span-2 block aspect-[3/4] overflow-hidden bg-cloud" aria-label={a.name}>
                <ProductImage src={a.imageUrl} alt={a.name} name={a.name} sizes="lg" />
              </Link>
              {b && (
                <Link href={`/p/${b.slug}`} className="col-span-2 mt-10 block aspect-square overflow-hidden bg-cloud" aria-label={b.name}>
                  <ProductImage src={b.imageUrl} alt={b.name} name={b.name} />
                </Link>
              )}
              {c && (
                <Link href={`/p/${c.slug}`} className="col-span-2 block aspect-[4/5] overflow-hidden bg-cloud" aria-label={c.name}>
                  <ProductImage src={c.imageUrl} alt={c.name} name={c.name} />
                </Link>
              )}
            </div>
          )}
        </Container>
      </section>

      {rooms.length > 0 && (
        <section id="rooms" className="mt-24 scroll-mt-6 bg-cloud py-16">
          <Container>
            <h2 className="headline text-[2.25rem]">{copy.categoriesTitle}</h2>
            <ul className="mt-8 grid gap-px bg-mist sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
              {rooms.map((room, i) => (
                <li key={room.id} className="bg-cloud">
                  <Link href={`/c/${room.slug}`} className="group flex h-full min-h-40 flex-col justify-between bg-paper p-6 transition-colors hover:bg-white">
                    <span className="tabular text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="headline block text-[1.9rem] leading-none group-hover:text-cobalt">{room.name}</span>
                      {room.children.length > 0 && (
                        <span className="mt-2 block text-sm text-ink-soft">{room.children.map((ch) => ch.name).join(" · ")}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <ProductSection
        title={copy.newTitle}
        link={copy.newLink}
        href="/search?sort=newest"
        products={data.latest.slice(0, 6)}
        className="mt-20"
        titleClassName="headline text-[2.25rem]"
      />
      <ProductSection
        title={copy.saleTitle}
        link={copy.saleLink}
        href="/search?onSale=true"
        products={data.onSale.slice(0, 3)}
        className="mt-20"
        titleClassName="headline text-[2.25rem]"
      />
      {data.latest.length === 0 && <EmptyCatalog text={copy.emptyCatalog} />}
    </>
  );
}
