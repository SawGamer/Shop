import { connection } from "next/server";
import { BeautyHome } from "@/components/home/beauty-home";
import { BooksHome } from "@/components/home/books-home";
import { ElectronicsHome } from "@/components/home/electronics-home";
import { FootwearHome } from "@/components/home/footwear-home";
import { GourmetHome } from "@/components/home/gourmet-home";
import { GroceryHome } from "@/components/home/grocery-home";
import { HomeHome } from "@/components/home/home-home";
import { SportsHome } from "@/components/home/sports-home";
import type { HomeData, HomeProps } from "@/components/home/types";
import { Container, Notice, ServiceDown } from "@/components/ui";
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
  sports: SportsHome,
  books: BooksHome,
  gourmet: GourmetHome,
};

async function loadHome(): Promise<HomeData | null> {
  try {
    const base = parseSearchParams({});
    const [categories, latest, onSale, deals] = await Promise.all([
      getCategories(),
      searchProducts({ ...base, sort: "newest" }, 12),
      searchProducts({ ...base, onSale: true, inStock: true, sort: "newest" }, 6),
      searchProducts({ ...base, deal: true, sort: "deal_ending" }, 8).catch(() => null),
    ]);
    return { categories, latest: latest.items, onSale: onSale.items, deals: deals?.items ?? [] };
  } catch {
    return null;
  }
}

type Props = { searchParams: Promise<{ deleted?: string }> };

export default async function HomePage({ searchParams }: Props) {
  // Rendered per request: the catalog lives in the API, which isn't available at build time.
  await connection();
  const { deleted } = await searchParams;
  const [data, { theme, settings }] = await Promise.all([loadHome(), getShop()]);
  const Layout = LAYOUTS[theme.id];

  return (
    <>
      {deleted === "1" && (
        <Container className="pt-4">
          <Notice tone="success" title="Your account was deleted" />
        </Container>
      )}
      <Layout data={data ?? { categories: [], latest: [], onSale: [], deals: [] }} theme={theme} settings={settings} />
      {!data && (
        <Container className="mt-10">
          <ServiceDown what="the catalog" />
        </Container>
      )}
    </>
  );
}
