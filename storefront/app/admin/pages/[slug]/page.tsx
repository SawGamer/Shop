import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageEditor } from "@/components/admin/page-editor";
import { Notice, PageTitle, ServiceDown } from "@/components/ui";
import { getPageFresh } from "@/lib/legal-data";
import { isPageSlug, LEGAL_FALLBACK_TITLES } from "@/lib/legal-text";
import type { ContentPage } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: isPageSlug(slug) ? `Edit ${LEGAL_FALLBACK_TITLES[slug].toLowerCase()}` : "Page" };
}

export default async function EditPagePage({ params }: Props) {
  await connection();
  const { slug } = await params;
  if (!isPageSlug(slug)) notFound();

  let page: ContentPage | null = null;
  let down = false;
  try {
    page = await getPageFresh(slug);
  } catch {
    down = true;
  }
  if (!page && !down) notFound();

  return (
    <div className="max-w-7xl">
      <p className="mb-2 text-sm">
        <Link href="/admin/pages" className="font-semibold text-cobalt hover:underline">
          ← All pages
        </Link>
      </p>
      <PageTitle sub={page?.isTemplate ? "This is still the starter text." : undefined}>
        {page?.title ?? LEGAL_FALLBACK_TITLES[slug]}
      </PageTitle>
      <Notice tone="warning" className="mb-8" title="Have this text checked by a lawyer before you go live">
        These texts are legally binding in many countries. Replace every [placeholder] with your own details.
      </Notice>
      {page ? (
        // key: after a save the server sends the stored text again; start the editor fresh from it.
        <PageEditor key={`${page.updatedAt}`} slug={slug} title={page.title} body={page.body} />
      ) : (
        <ServiceDown what="this page" />
      )}
    </div>
  );
}
