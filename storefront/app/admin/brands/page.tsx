import type { Metadata } from "next";
import { AdminTitle, Panel } from "@/components/admin/bits";
import { BrandRow, NewBrandForm } from "@/components/admin/taxonomy";
import { getBrandsFresh } from "@/lib/data";

export const metadata: Metadata = { title: "Brands" };

export default async function AdminBrandsPage() {
  const brands = [...(await getBrandsFresh())].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <AdminTitle sub="A brand can only be deleted once no product uses it.">Brands</AdminTitle>
      <div className="space-y-4">
        <Panel title="Add a brand">
          <NewBrandForm />
        </Panel>
        <Panel title={`${brands.length} brands`}>
          {brands.length === 0 ? (
            <p className="text-sm text-ink-soft">No brands yet.</p>
          ) : (
            <ul>
              {brands.map((b) => (
                <BrandRow key={b.id} brand={b} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
