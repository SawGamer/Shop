import type { Metadata } from "next";
import Link from "next/link";
import { AdminTitle, Panel } from "@/components/admin/bits";
import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/lib/actions/admin";
import { getAdminCategories, getBrandsFresh } from "@/lib/data";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const [brands, categories] = await Promise.all([getBrandsFresh(), getAdminCategories()]);
  return (
    <>
      <Link href="/admin/products" className="text-sm font-semibold text-cobalt hover:underline">
        All products
      </Link>
      <AdminTitle sub="Save the product first, then add sizes, stock and images.">New product</AdminTitle>
      {brands.length === 0 ? (
        <Panel>
          <p className="text-sm">
            Products need a brand.{" "}
            <Link href="/admin/brands" className="font-semibold text-cobalt hover:underline">
              Add a brand first
            </Link>
            .
          </p>
        </Panel>
      ) : (
        <Panel>
          <ProductForm action={createProduct} brands={brands} categories={categories} submitLabel="Create product" />
        </Panel>
      )}
    </>
  );
}
