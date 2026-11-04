import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTitle, Panel } from "@/components/admin/bits";
import { ImageManager } from "@/components/admin/image-manager";
import { ProductForm } from "@/components/admin/product-form";
import { VariantEditor } from "@/components/admin/variant-editor";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Notice } from "@/components/ui";
import { archiveProduct, updateProduct } from "@/lib/actions/admin";
import { getAdminCategories, getAdminProduct, getBrandsFresh } from "@/lib/data";
import { formatDateTime, PRODUCT_STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Edit product" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export default async function EditProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { created } = await searchParams;
  const [product, brands, categories] = await Promise.all([getAdminProduct(id), getBrandsFresh(), getAdminCategories()]);
  if (!product) notFound();

  const totalAvailable = product.variants.reduce((n, v) => n + v.available, 0);

  return (
    <>
      <Link href="/admin/products" className="text-sm font-semibold text-cobalt hover:underline">
        All products
      </Link>
      <AdminTitle
        sub={`${PRODUCT_STATUS_LABEL[product.status]}, ${totalAvailable} available, updated ${formatDateTime(product.updatedAt)}`}
        actions={
          product.status === "ACTIVE" ? (
            <Link href={`/p/${product.slug}`} className="btn btn-quiet btn-sm" target="_blank">
              View in shop
            </Link>
          ) : null
        }
      >
        {product.name}
      </AdminTitle>

      {created && (
        <Notice tone="success" className="mb-5" title="Product created">
          Next, add a variant for each size and colour, set stock and upload images. Set the status to Active when
          it&apos;s ready to sell.
        </Notice>
      )}

      <div className="space-y-4">
        <Panel title="Details">
          <ProductForm
            action={updateProduct.bind(null, product.id)}
            brands={brands}
            categories={categories}
            product={product}
            submitLabel="Save changes"
          />
        </Panel>

        <Panel title="Variants and stock">
          <VariantEditor productId={product.id} variants={product.variants} />
        </Panel>

        <Panel title="Images">
          <ImageManager productId={product.id} images={product.images} />
        </Panel>

        {product.status !== "ARCHIVED" && (
          <Panel title="Archive">
            <p className="mb-3 text-sm text-ink-soft">
              Archiving hides the product from the shop and search. Past orders keep their details.
            </p>
            <ActionForm action={archiveProduct.bind(null, product.id)} confirm={`Archive ${product.name}?`}>
              <SubmitButton className="btn btn-danger" pendingLabel="Archiving…">
                Archive product
              </SubmitButton>
            </ActionForm>
          </Panel>
        )}
      </div>
    </>
  );
}
