import clsx from "clsx";
import Link from "next/link";
import { compareSizes, swatchFor } from "@/lib/colors";
import { formatMoney } from "@/lib/money";
import { getShop } from "@/lib/shop";
import type { CardVariant } from "@/lib/themes/types";
import type { ProductSummary } from "@/lib/types";
import { CompareToggle } from "./compare";
import { DealCountdown } from "./deal-countdown";
import { QuickAdd } from "./quick-add";
import { Price, ProductImage, SaleSticker } from "./ui";

function DealLine({ product, className }: { product: ProductSummary; className?: string }) {
  if (!product.dealEndsAt) return null;
  return <DealCountdown endsAt={product.dealEndsAt} tone="strong" className={className} />;
}

function SoldOut({ className }: { className?: string }) {
  return (
    <span className={clsx("rounded-tag bg-ink px-2 py-0.5 text-sm font-semibold text-paper", className)}>Sold out</span>
  );
}

/** Footwear: tall card with the yellow sale sticker. */
function BoxCard({ product }: { product: ProductSummary }) {
  return (
    <Link href={`/p/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-tag bg-cloud">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          name={product.name}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <SaleSticker price={product.price} compareAt={product.compareAtPrice} className="absolute left-2 top-2" />
        {!product.inStock && <SoldOut className="absolute bottom-2 left-2" />}
      </div>
      <div className="mt-3">
        <p className="text-sm text-ink-soft">{product.brand.name}</p>
        <h3 className="font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
          {product.name}
        </h3>
        <Price price={product.price} compareAt={product.compareAtPrice} className="mt-1 text-sm" />
        <DealLine product={product} className="mt-1" />
      </div>
    </Link>
  );
}

function saving(product: ProductSummary): string | null {
  const { price, compareAtPrice } = product;
  if (!compareAtPrice || compareAtPrice.cents <= price.cents) return null;
  return formatMoney({ cents: compareAtPrice.cents - price.cents, currency: price.currency });
}

/** Electronics: white spec card with capacity chips and a "Save €X" badge. */
function TechCard({ product }: { product: ProductSummary }) {
  const sizes = [...product.sizes].sort(compareSizes);
  const save = saving(product);
  return (
    <Link
      href={`/p/${product.slug}`}
      className="group flex h-full flex-col rounded-tag border border-mist bg-white p-3 transition hover:border-cobalt hover:shadow-[0_8px_30px_-12px_rgba(15,18,23,0.25)]"
    >
      <div className="relative aspect-square overflow-hidden rounded-control bg-paper">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          name={product.name}
          className="transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {product.dealEndsAt ? (
          <span className="absolute left-2 top-2 rounded-full bg-signal px-2 py-0.5 text-xs font-bold text-white">
            Deal{save ? ` · Save ${save}` : ""}
          </span>
        ) : (
          save && (
            <span className="absolute left-2 top-2 rounded-full bg-sticker px-2 py-0.5 text-xs font-bold text-ink">
              Save {save}
            </span>
          )
        )}
        {!product.inStock && <SoldOut className="absolute bottom-2 left-2" />}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">{product.brand.name}</p>
      <h3 className="mt-0.5 font-semibold leading-snug group-hover:text-cobalt">{product.name}</h3>
      {(product.highlights?.length ?? 0) > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-ink-soft" aria-label="Key specifications">
          {product.highlights!.slice(0, 3).map((h) => (
            <li key={h} className="flex gap-1.5">
              <span aria-hidden className="mt-[0.4rem] size-1 shrink-0 rounded-full bg-ink-faint" />
              {h}
            </li>
          ))}
        </ul>
      )}
      {sizes.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Capacities">
          {sizes.slice(0, 3).map((s) => (
            <li key={s} className="tabular rounded-full border border-mist px-2 py-0.5 text-xs text-ink-soft">
              {s}
            </li>
          ))}
          {sizes.length > 3 && <li className="px-1 text-xs text-ink-faint">+{sizes.length - 3}</li>}
        </ul>
      )}
      <Price
        price={product.price}
        compareAt={product.compareAtPrice}
        from={sizes.length > 1}
        className="mt-auto pt-3 text-base"
      />
      <DealLine product={product} className="mt-1" />
    </Link>
  );
}

/** Grocery: compact card with a one-tap "Add". */
function MarketCard({ product }: { product: ProductSummary }) {
  const pack = product.sizes.length === 1 ? product.sizes[0] : null;
  return (
    <div className="flex h-full flex-col rounded-tag bg-white p-2.5 shadow-[0_1px_0_rgba(29,58,38,0.08)] ring-1 ring-mist">
      <Link href={`/p/${product.slug}`} className="group block">
        <div className="relative aspect-square overflow-hidden rounded-control bg-cloud">
          <ProductImage src={product.imageUrl} alt={product.name} name={product.name} sizes="sm" />
          <SaleSticker
            price={product.price}
            compareAt={product.compareAtPrice}
            className="absolute left-1.5 top-1.5 rounded-full"
          />
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug group-hover:underline">{product.name}</h3>
        <p className="text-xs text-ink-faint">{pack ?? product.brand.name}</p>
        <DealLine product={product} className="mt-1" />
      </Link>
      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <Price price={product.price} compareAt={product.compareAtPrice} className="flex-col !gap-0 text-sm" />
        {product.inStock ? (
          <QuickAdd slug={product.slug} name={product.name} />
        ) : (
          <span className="text-xs font-semibold text-ink-faint">Sold out</span>
        )}
      </div>
    </div>
  );
}

function Swatches({ colors, max, size = "size-3.5" }: { colors: string[]; max: number; size?: string }) {
  const known = colors.filter((c) => swatchFor(c));
  if (known.length === 0) return null;
  return (
    <ul className="flex items-center gap-1.5" aria-label={`${colors.length} ${colors.length === 1 ? "option" : "options"}`}>
      {known.slice(0, max).map((c) => (
        <li key={c}>
          <span
            title={c}
            aria-label={c}
            className={clsx("block rounded-full ring-1 ring-ink/15 ring-offset-1 ring-offset-paper", size)}
            style={{ background: swatchFor(c)! }}
          />
        </li>
      ))}
      {known.length > max && <li className="text-xs text-ink-faint">+{known.length - max}</li>}
    </ul>
  );
}

/** Home: tall, quiet portrait card with finish swatches. */
function PortraitCard({ product }: { product: ProductSummary }) {
  return (
    <Link href={`/p/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-cloud">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          name={product.name}
          className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        {!product.inStock && <SoldOut className="absolute bottom-3 left-3" />}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="headline text-[1.35rem] leading-tight">{product.name}</h3>
          <p className="mt-1 text-sm text-ink-soft">{product.brand.name}</p>
        </div>
        <Swatches colors={product.colors} max={4} />
      </div>
      <Price price={product.price} compareAt={product.compareAtPrice} from={product.sizes.length > 1} className="mt-2 text-sm" />
      <DealLine product={product} className="mt-1" />
    </Link>
  );
}

/** Beauty: rounded card, centred text and shade dots. */
function BoutiqueCard({ product }: { product: ProductSummary }) {
  return (
    <Link href={`/p/${product.slug}`} className="group block text-center">
      <div className="relative aspect-[3/4] overflow-hidden rounded-tag bg-white">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          name={product.name}
          className="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <SaleSticker
          price={product.price}
          compareAt={product.compareAtPrice}
          className="absolute left-3 top-3 rounded-full px-2.5"
        />
        {!product.inStock && <SoldOut className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full" />}
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink-faint">{product.brand.name}</p>
      <h3 className="headline mt-1 text-[1.4rem] leading-tight group-hover:text-cobalt">{product.name}</h3>
      <div className="mt-2 flex justify-center">
        <Swatches colors={product.colors} max={5} size="size-3" />
      </div>
      <Price price={product.price} compareAt={product.compareAtPrice} className="mt-1.5 justify-center text-sm" />
      <DealLine product={product} className="mt-1 justify-center" />
    </Link>
  );
}

/** Sports: crisp white tile, condensed name, colour dots and an orange rule on hover. */
function SportCard({ product }: { product: ProductSummary }) {
  const sizes = [...product.sizes].sort(compareSizes);
  return (
    <Link
      href={`/p/${product.slug}`}
      className="group flex h-full flex-col border-b-4 border-transparent bg-white transition-colors hover:border-cobalt"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-cloud">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          name={product.name}
          className="transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <SaleSticker price={product.price} compareAt={product.compareAtPrice} className="absolute left-0 top-3 !rounded-none px-2.5 text-base" />
        {!product.inStock && <SoldOut className="absolute bottom-2 left-2" />}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="text-sm text-ink-faint">{product.brand.name}</p>
        <h3 className="headline mt-0.5 text-[1.35rem] leading-[1.1]">{product.name}</h3>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Swatches colors={product.colors} max={4} size="size-3" />
          {sizes.length > 1 && <span className="tabular text-xs text-ink-faint">{sizes.length} sizes</span>}
        </div>
        <Price price={product.price} compareAt={product.compareAtPrice} from={sizes.length > 1} className="mt-auto pt-3 text-base" />
        <DealLine product={product} className="mt-1" />
      </div>
    </Link>
  );
}

/** Books: the cover as an object (spine shadow), title, publisher, format chips. */
function CoverCard({ product }: { product: ProductSummary }) {
  const formats = [...product.sizes].sort(compareSizes);
  return (
    <Link href={`/p/${product.slug}`} className="group flex h-full flex-col">
      <div className="relative bg-cloud px-5 pb-5 pt-6">
        <div className="relative aspect-[2/3] overflow-hidden rounded-r-[3px] rounded-l-[1px] shadow-[inset_6px_0_6px_-4px_rgba(0,0,0,0.28),4px_6px_14px_-4px_rgba(27,36,56,0.45)] transition-transform duration-300 group-hover:-translate-y-1">
          <ProductImage src={product.imageUrl} alt={product.name} name={product.name} />
          <span aria-hidden className="absolute inset-y-0 left-1.5 w-px bg-black/20" />
        </div>
        <SaleSticker price={product.price} compareAt={product.compareAtPrice} className="absolute right-2 top-2 rounded-full px-2" />
        {!product.inStock && <SoldOut className="absolute bottom-2 left-2" />}
      </div>
      <h3 className="headline mt-3 text-[1.15rem] leading-snug group-hover:text-cobalt">{product.name}</h3>
      <p className="text-sm text-ink-soft">{product.brand.name}</p>
      {formats.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Formats">
          {formats.slice(0, 3).map((f) => (
            <li key={f} className="rounded-tag border border-mist bg-white px-1.5 py-0.5 text-xs text-ink-soft">
              {f}
            </li>
          ))}
        </ul>
      )}
      <Price price={product.price} compareAt={product.compareAtPrice} from={formats.length > 1} className="mt-auto pt-3 text-base" />
      <DealLine product={product} className="mt-1" />
    </Link>
  );
}

/** Gourmet: a big rounded photo, serif name, portions and flavour dots. */
function TreatCard({ product }: { product: ProductSummary }) {
  const portions = [...product.sizes].sort(compareSizes);
  return (
    <Link href={`/p/${product.slug}`} className="group flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-tag)] bg-cloud">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          name={product.name}
          className="transition-transform duration-500 group-hover:scale-[1.05]"
        />
        <SaleSticker price={product.price} compareAt={product.compareAtPrice} className="absolute left-3 top-3 rounded-full px-3" />
        {!product.inStock && <SoldOut className="absolute bottom-3 left-3 rounded-full px-3" />}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="headline text-[1.5rem] leading-[1.1] group-hover:text-cobalt">{product.name}</h3>
        <Swatches colors={product.colors} max={4} size="size-3" />
      </div>
      <p className="mt-0.5 text-sm text-ink-soft">{product.brand.name}</p>
      {portions.length > 1 && (
        <p className="mt-1 text-xs text-ink-faint">{portions.slice(0, 3).join(" · ")}{portions.length > 3 ? " …" : ""}</p>
      )}
      <Price price={product.price} compareAt={product.compareAtPrice} from={portions.length > 1} className="mt-auto pt-2 text-base" />
      <DealLine product={product} className="mt-1" />
    </Link>
  );
}

const CARDS: Record<CardVariant, (p: { product: ProductSummary }) => React.ReactNode> = {
  box: BoxCard,
  tech: TechCard,
  market: MarketCard,
  portrait: PortraitCard,
  boutique: BoutiqueCard,
  sport: SportCard,
  cover: CoverCard,
  treat: TreatCard,
};

const GRID: Record<CardVariant, string> = {
  box: "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4",
  tech: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4",
  market: "grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6",
  portrait: "grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-8 lg:grid-cols-3",
  boutique: "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4",
  sport: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4",
  cover: "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5",
  treat: "grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 sm:gap-x-6",
};

export function ProductCard({
  product,
  variant = "box",
  compare = false,
}: {
  product: ProductSummary;
  variant?: CardVariant;
  /** Show a "Compare" toggle over the card's image. */
  compare?: boolean;
}) {
  const Card = CARDS[variant];
  if (!compare) return <Card product={product} />;
  return (
    <div className="relative h-full">
      <Card product={product} />
      <CompareToggle
        slug={product.slug}
        name={product.name}
        imageUrl={product.imageUrl}
        className={variant === "tech" ? "absolute right-5 top-5 z-10" : "absolute right-2 top-2 z-10"}
      />
    </div>
  );
}

/** Product grid in the active design's card style. */
export async function ProductGrid({ products, variant }: { products: ProductSummary[]; variant?: CardVariant }) {
  const { layout } = (await getShop()).theme;
  const card = variant ?? layout.card;
  return (
    <ul className={GRID[card]}>
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} variant={card} compare={layout.compareOnCards} />
        </li>
      ))}
    </ul>
  );
}
