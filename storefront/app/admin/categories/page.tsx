import type { Metadata } from "next";
import { AdminTitle, Panel } from "@/components/admin/bits";
import { CategoryRow, NewCategoryForm } from "@/components/admin/taxonomy";
import { getAdminCategories } from "@/lib/data";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <AdminTitle sub="Top-level categories appear in the shop's navigation.">Categories</AdminTitle>
      <div className="space-y-4">
        <Panel title="Add a category">
          <NewCategoryForm categories={sorted} />
        </Panel>
        <Panel title={`${sorted.length} categories`}>
          {sorted.length === 0 ? (
            <p className="text-sm text-ink-soft">No categories yet.</p>
          ) : (
            <ul>
              {sorted.map((c) => (
                <CategoryRow key={c.id} category={c} categories={sorted} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
