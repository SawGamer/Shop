import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompareToggle } from "@/components/compare";
import { DealCountdown } from "@/components/deal-countdown";
import { ProductGallery } from "@/components/product-gallery";
import { SpecTable } from "@/components/spec-table";
import { VariantPicker } from "@/components/variant-picker";
import { Container } from "@/components/ui";
import { getProduct } from "@/lib/data";
import { getShop } from "@/lib/shop";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    if (!product) return { title: "Not found" };
    return {
      title: `${product.name} by ${product.brand.name}`,
      description: product.description.slice(0, 160),
      openGraph: product.images[0] ? { images: [product.images[0].url] } : undefined,
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, { theme }] = await Promise.all([getProduct(slug), getShop()]);
  if (!product) notFound();
  const category = product.categories[0];
  const { labels, layout } = theme;

  return (
    <Container className="py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-soft">
        <ol className="flex flex-wrap gap-1.5">
          <li>
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span aria-hidden> /</span>
          </li>
          {category && (
            <li>
              <Link href={`/c/${category.slug}`} className="hover:underline">
                {category.name}
              </Link>
              <span aria-hidden> /</span>
            </li>
          )}
          <li aria-current="page" className="text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
        <ProductGallery images={product.images} name={product.name} portrait={layout.card === "cover"} />
        <div className="lg:sticky lg:top-6 lg:self-start">
          {product.deal && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-tag bg-signal px-4 py-2.5 text-white">
              <p className="text-sm font-bold">
                Deal of the day <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">−{product.deal.percentOff}%</span>
              </p>
              <DealCountdown endsAt={product.deal.endsAt} tone="inverse" />
            </div>
          )}
          <VariantPicker
            product={product}
            labels={{ size: labels.size, sizeShort: labels.sizeShort, color: labels.color, choose: labels.choose }}
            sizeOptions={layout.sizeOptions}
            colorOptions={layout.colorOptions}
            buyBox={layout.buyBox}
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <CompareToggle
              slug={product.slug}
              name={product.name}
              imageUrl={product.images[0]?.url ?? null}
              variant="inline"
            />
            {(product.specs?.length ?? 0) > 0 && (
              <a href="#specifications" className="text-xs font-semibold text-cobalt hover:underline">
                See all {product.specs!.length} specifications
              </a>
            )}
          </div>
        </div>
      </div>

      <SpecTable specs={product.specs ?? []} />

      {product.description && (
        <section className="mt-14 max-w-2xl">
          <h2 className="headline text-2xl">{theme.copy.aboutProduct}</h2>
          <div className="mt-4 whitespace-pre-line leading-relaxed text-ink-soft">{product.description}</div>
          <p className="mt-6 text-sm">
            More from{" "}
            <Link href={`/search?brand=${product.brand.slug}`} className="font-semibold text-cobalt hover:underline">
              {product.brand.name}
            </Link>
          </p>
        </section>
      )}
    </Container>
  );
}
