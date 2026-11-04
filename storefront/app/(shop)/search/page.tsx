import type { Metadata } from "next";
import { SearchView } from "@/components/search-view";
import { Container, PageTitle } from "@/components/ui";
import { parseSearchParams, type RawSearchParams } from "@/lib/search";

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = parseSearchParams(await searchParams);
  return { title: q.q ? `“${q.q}”` : q.onSale ? "Sale" : "All shoes" };
}

export default async function SearchPage({ searchParams }: Props) {
  const query = parseSearchParams(await searchParams);
  const title = query.q ? `Results for “${query.q}”` : query.onSale ? "On sale" : query.sort === "newest" ? "New arrivals" : "All shoes";
  return (
    <Container className="py-8 sm:py-10">
      <PageTitle>{title}</PageTitle>
      <SearchView query={query} base="/search" />
    </Container>
  );
}
