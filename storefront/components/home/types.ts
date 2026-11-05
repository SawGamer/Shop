import type { ShopSettings } from "@/lib/types";
import type { Theme } from "@/lib/themes/types";
import type { Category, ProductSummary } from "@/lib/types";

export type HomeData = {
  categories: Category[];
  latest: ProductSummary[];
  onSale: ProductSummary[];
};

export type HomeProps = { data: HomeData; theme: Theme; settings: ShopSettings };
