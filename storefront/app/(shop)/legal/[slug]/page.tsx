import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalText } from "@/components/legal-text";
import { Container, Notice, PageTitle, ServiceDown } from "@/components/ui";
import { getCurrentUserSafe, isAdmin } from "@/lib/auth";
import { getPage } from "@/lib/legal-data";
import { isPageSlug, LEGAL_FALLBACK_TITLES } from "@/lib/legal-text";
import { getShop } from "@/lib/shop";
import type { ContentPage } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isPageSlug(slug)) return { title: "Page not found" };
  let title: string = LEGAL_FALLBACK_TITLES[slug];
  try {
    title = (await getPage(slug))?.title ?? title;
  } catch {
    // fall back to the fixed title while the API is unreachable
  }
  return { title };
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params;
  if (!isPageSlug(slug)) notFound();

  let page: ContentPage | null = null;
  let down = false;
  try {
    page = await getPage(slug);
  } catch {
    down = true;
  }
  if (!page && !down) notFound();

  // Only admins are told that the text is still the starter text; visitors just see the page.
  const [user, { settings }] = await Promise.all([getCurrentUserSafe(), getShop()]);
  const showTemplateNotice = !!page?.isTemplate && isAdmin(user);

  return (
    <Container className="max-w-3xl py-10">
      <PageTitle>{page?.title ?? LEGAL_FALLBACK_TITLES[slug]}</PageTitle>
      {showTemplateNotice && (
        <Notice tone="warning" className="mb-8" title="This is still the starter text. Replace it in Admin → Pages">
          <Link href={`/admin/pages/${slug}`} className="font-semibold text-cobalt hover:underline">
            Edit this page
          </Link>{" "}
          · Only admins see this notice.
        </Notice>
      )}
      {page ? <LegalText text={page.body} /> : <ServiceDown what={`the ${LEGAL_FALLBACK_TITLES[slug].toLowerCase()}`} />}
      <p className="mt-12 text-sm text-ink-faint">{settings.name}</p>
    </Container>
  );
}
