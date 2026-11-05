import type { Metadata } from "next";
import { SearchView } from "@/components/search-view";
import { Container, PageTitle } from "@/components/ui";
import { parseSearchParams, type RawSearchParams } from "@/lib/search";
import { getShop } from "@/lib/shop";

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = parseSearchParams(await searchParams);
  const { theme } = await getShop();
  return { title: q.q ? `“${q.q}”` : q.deal ? "Deals of the day" : q.onSale ? "Sale" : theme.labels.allProducts };
}

export default async function SearchPage({ searchParams }: Props) {
  const query = parseSearchParams(await searchParams);
  const { theme } = await getShop();
  const title = query.q
    ? `Results for “${query.q}”`
    : query.deal
      ? "Deals of the day"
      : query.onSale
      ? theme.copy.saleTitle
      : query.sort === "newest"
        ? theme.copy.newTitle
        : theme.labels.allProducts;
  return (
    <Container className="py-8 sm:py-10">
      <PageTitle>{title}</PageTitle>
      <SearchView query={query} base="/search" />
    </Container>
  );
}
