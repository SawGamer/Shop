import clsx from "clsx";
import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { Container } from "@/components/ui";
import type { ProductSummary } from "@/lib/types";

/** A titled product row with a "see all" link, shared by every home layout. */
export function ProductSection({
  title,
  link,
  href,
  products,
  className,
  titleClassName = "headline text-2xl",
}: {
  title: string;
  link: string;
  href: string;
  products: ProductSummary[];
  className?: string;
  titleClassName?: string;
}) {
  if (products.length === 0) return null;
  return (
    <Container className={clsx("mt-16", className)}>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className={titleClassName}>{title}</h2>
        <Link href={href} className="shrink-0 text-sm font-semibold text-cobalt hover:underline">
          {link}
        </Link>
      </div>
      <ProductGrid products={products} />
    </Container>
  );
}

export function EmptyCatalog({ text }: { text: string }) {
  return (
    <Container className="mt-14">
      <p className="text-ink-soft">{text}</p>
    </Container>
  );
}
