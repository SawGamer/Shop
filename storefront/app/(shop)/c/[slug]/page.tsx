import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SearchView } from "@/components/search-view";
import { Container, PageTitle, ServiceDown } from "@/components/ui";
import { getCategories } from "@/lib/data";
import { parseSearchParams, type RawSearchParams } from "@/lib/search";
import type { Category } from "@/lib/types";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

/** Finds a category anywhere in the tree, with its ancestors for the breadcrumb. */
function findCategory(nodes: Category[], slug: string, trail: Category[] = []): { node: Category; trail: Category[] } | null {
  for (const n of nodes) {
    if (n.slug === slug) return { node: n, trail };
    const hit = findCategory(n.children, slug, [...trail, n]);
    if (hit) return hit;
  }
  return null;
}

async function load(slug: string) {
  try {
    return { found: findCategory(await getCategories(), slug), down: false };
  } catch {
    return { found: null, down: true };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { found } = await load(slug);
  return { title: found?.node.name ?? "Category" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { found, down } = await load(slug);
  if (down) {
    return (
      <Container className="py-10">
        <ServiceDown what="this category" />
      </Container>
    );
  }
  if (!found) notFound();
  const query = parseSearchParams(await searchParams);
  const { node, trail } = found;

  return (
    <Container className="py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-soft">
        <ol className="flex flex-wrap gap-1.5">
          <li>
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span aria-hidden> /</span>
          </li>
          {trail.map((t) => (
            <li key={t.id}>
              <Link href={`/c/${t.slug}`} className="hover:underline">
                {t.name}
              </Link>
              <span aria-hidden> /</span>
            </li>
          ))}
          <li aria-current="page" className="text-ink">
            {node.name}
          </li>
        </ol>
      </nav>
      <PageTitle>{node.name}</PageTitle>
      {node.children.length > 0 && (
        <ul className="-mt-2 mb-8 flex flex-wrap gap-2">
          {node.children.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.slug}`} className="btn btn-quiet btn-sm bg-white">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <SearchView query={query} base={`/c/${node.slug}`} fixedCategory={node.slug} />
    </Container>
  );
}
