import Link from "next/link";
import { Price, ProductImage, SaleSticker } from "./ui";
import type { ProductSummary } from "@/lib/types";

export function ProductCard({ product }: { product: ProductSummary }) {
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
        {!product.inStock && (
          <span className="absolute bottom-2 left-2 rounded-tag bg-ink px-2 py-0.5 text-sm font-semibold text-paper">
            Sold out
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm text-ink-soft">{product.brand.name}</p>
        <h3 className="font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
          {product.name}
        </h3>
        <Price price={product.price} compareAt={product.compareAtPrice} className="mt-1 text-sm" />
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
