import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Notice, PageTitle } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getPageFresh } from "@/lib/legal-data";
import { LEGAL_FALLBACK_TITLES, PAGE_SLUGS } from "@/lib/legal-text";
import type { ContentPage, PageSlug } from "@/lib/types";

export const metadata: Metadata = { title: "Pages" };

export default async function AdminPagesPage() {
  await connection();
  const pages: { slug: PageSlug; page: ContentPage | null }[] = await Promise.all(
    PAGE_SLUGS.map(async (slug) => ({ slug, page: await getPageFresh(slug).catch(() => null) })),
  );

  return (
    <div className="max-w-4xl">
      <PageTitle sub="The legal pages linked in the footer of your shop.">Pages</PageTitle>
      <Notice tone="warning" className="mb-8" title="Have these texts checked by a lawyer before you go live">
        These texts are legally binding in many countries. The starter texts only show the structure; replace every
        [placeholder] with your own details.
      </Notice>

      <ul className="divide-y divide-mist rounded-tag bg-white">
        {pages.map(({ slug, page }) => (
          <li key={slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{page?.title ?? LEGAL_FALLBACK_TITLES[slug]}</p>
              <p className="text-sm text-ink-faint">
                /legal/{slug}
                {page?.updatedAt ? ` · updated ${formatDate(page.updatedAt)}` : ""}
              </p>
            </div>
            {page ? (
              page.isTemplate ? (
                <span className="rounded-tag bg-sticker/60 px-2 py-0.5 text-xs font-semibold">Starter text</span>
              ) : (
                <span className="rounded-tag bg-moss/12 px-2 py-0.5 text-xs font-semibold text-moss">Edited</span>
              )
            ) : (
              <span className="rounded-tag bg-signal/10 px-2 py-0.5 text-xs font-semibold text-signal">Unavailable</span>
            )}
            <div className="flex gap-2">
              <Link href={`/legal/${slug}`} className="btn btn-quiet btn-sm">
                View
              </Link>
              <Link href={`/admin/pages/${slug}`} className="btn btn-ink btn-sm">
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
