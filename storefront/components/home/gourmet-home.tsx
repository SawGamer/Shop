import Link from "next/link";
import { Container, Price, ProductImage } from "@/components/ui";
import { EmptyCatalog, ProductSection } from "./sections";
import type { HomeProps } from "./types";

const PROMISES = [
  { title: "Pick up in store", text: "Ready within 30 minutes, free", icon: "M4 9h16l-1 11H5zM8 9a4 4 0 0 1 8 0" },
  { title: "Delivered the same day", text: "Order by 2 pm, choose a time slot", icon: "M3 7h11v8H3zM14 10h4l3 3v2h-7zM6.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" },
  { title: "Made fresh daily", text: "Small batches, no shortcuts", icon: "M12 3c3 3 5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 2-6 5-9z" },
];

/** A split hero with an arched photo, a pickup-and-delivery band, big category cards, then the menu. */
export function GourmetHome({ data, theme }: HomeProps) {
  const { copy } = theme;
  const [feature, ...rest] = data.latest;
  const multi = (feature?.sizes.length ?? 0) > 1;

  return (
    <>
      <section className="bg-cloud">
        <Container className="grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div>
            <p className="text-base font-medium text-cobalt">{copy.heroEyebrow}</p>
            <h1 className="headline mt-3 text-[3rem] leading-[1.02] sm:text-[4.5rem]">{copy.heroTitle}</h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">{copy.heroSub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={feature ? `/p/${feature.slug}` : "/search"} className="btn btn-primary">
                {copy.primaryCta}
              </Link>
              <Link href="/search" className="btn btn-quiet">
                {copy.secondaryCta}
              </Link>
            </div>
          </div>
          {feature && (
            <Link href={`/p/${feature.slug}`} aria-label={feature.name} className="group relative mx-auto block w-full max-w-sm">
              <div className="aspect-[4/5] overflow-hidden rounded-t-full rounded-b-[var(--radius-tag)] bg-mist">
                <ProductImage src={feature.imageUrl} alt={feature.name} name={feature.name} sizes="lg" className="transition-transform duration-500 group-hover:scale-[1.04]" />
              </div>
              <div className="absolute -bottom-4 left-4 rounded-[var(--radius-control)] bg-white px-4 py-2.5 shadow-[0_10px_30px_-12px_rgba(58,34,24,0.45)]">
                <p className="headline text-xl leading-tight">{feature.name}</p>
                <Price price={feature.price} compareAt={feature.compareAtPrice} from={multi} className="text-sm" />
              </div>
            </Link>
          )}
        </Container>
      </section>

      <section aria-label="Pickup and delivery" className="bg-ink text-paper">
        <Container className="grid gap-4 py-5 sm:grid-cols-3">
          {PROMISES.map((p) => (
            <div key={p.title} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sticker text-ink">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={p.icon} />
                </svg>
              </span>
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-paper/70">{p.text}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>

      {data.categories.length > 0 && (
        <Container className="mt-16">
          <h2 className="headline text-4xl">{copy.categoriesTitle}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.categories.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  className="group flex h-full flex-col rounded-[var(--radius-tag)] bg-white p-6 ring-1 ring-mist transition hover:ring-cobalt"
                >
                  <span className="headline text-[1.75rem] leading-tight group-hover:text-cobalt">{c.name}</span>
                  {c.children.length > 0 && (
                    <span className="mt-2 text-sm text-ink-soft">{c.children.map((k) => k.name).join(", ")}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      <ProductSection title={copy.newTitle} link={copy.newLink} href="/search?sort=newest" products={rest.slice(0, 8)} titleClassName="headline text-4xl" />
      <ProductSection title={copy.saleTitle} link={copy.saleLink} href="/search?onSale=true" products={data.onSale.slice(0, 4)} titleClassName="headline text-4xl" />
      {data.latest.length === 0 && <EmptyCatalog text={copy.emptyCatalog} />}
    </>
  );
}
