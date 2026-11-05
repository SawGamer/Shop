import { connection } from "next/server";
import { BeautyHome } from "@/components/home/beauty-home";
import { ElectronicsHome } from "@/components/home/electronics-home";
import { FootwearHome } from "@/components/home/footwear-home";
import { GroceryHome } from "@/components/home/grocery-home";
import { HomeHome } from "@/components/home/home-home";
import type { HomeData, HomeProps } from "@/components/home/types";
import { Container, ServiceDown } from "@/components/ui";
import { getCategories, searchProducts } from "@/lib/data";
import { parseSearchParams } from "@/lib/search";
import { getShop } from "@/lib/shop";
import type { ThemeId } from "@/lib/themes";

const LAYOUTS: Record<ThemeId, (props: HomeProps) => React.ReactNode> = {
  footwear: FootwearHome,
  electronics: ElectronicsHome,
  grocery: GroceryHome,
  home: HomeHome,
  beauty: BeautyHome,
};

async function loadHome(): Promise<HomeData | null> {
  try {
    const base = parseSearchParams({});
    const [categories, latest, onSale] = await Promise.all([
      getCategories(),
      searchProducts({ ...base, sort: "newest" }, 12),
      searchProducts({ ...base, onSale: true, inStock: true, sort: "newest" }, 6),
    ]);
    return { categories, latest: latest.items, onSale: onSale.items };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  // Rendered per request: the catalog lives in the API, which isn't available at build time.
  await connection();
  const [data, { theme, settings }] = await Promise.all([loadHome(), getShop()]);
  const Layout = LAYOUTS[theme.id];

  return (
    <>
      <Layout data={data ?? { categories: [], latest: [], onSale: [] }} theme={theme} settings={settings} />
      {!data && (
        <Container className="mt-10">
          <ServiceDown what="the catalog" />
        </Container>
      )}
    </>
  );
}
