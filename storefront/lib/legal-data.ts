import "server-only";
import { api, isApiError } from "./api";
import { isPageSlug, LEGAL_FALLBACK_TITLES, PAGE_SLUGS } from "./legal-text";
import type { ContentPage, PageSlug, PageSummary } from "./types";

// The legal pages change rarely and are the same for everybody, so shoppers get them from a short cache under
// the "pages" tag; saving a page in the admin expires the tag. The admin reads them uncached.
const TTL = 60;

/** Titles for the footer links; fixed English titles when the API can't be reached. */
export async function getPageSummaries(): Promise<PageSummary[]> {
  try {
    const list = await api<PageSummary[]>("/api/v1/pages", { auth: false, revalidate: TTL, tags: ["pages"] });
    const bySlug = new Map(list.filter((p) => isPageSlug(p.slug)).map((p) => [p.slug, p]));
    return PAGE_SLUGS.map((slug) => bySlug.get(slug) ?? { slug, title: LEGAL_FALLBACK_TITLES[slug], isTemplate: true });
  } catch {
    return PAGE_SLUGS.map((slug) => ({ slug, title: LEGAL_FALLBACK_TITLES[slug], isTemplate: true }));
  }
}

/** A page for shoppers. Null when it doesn't exist; throws when the API is unreachable. */
export async function getPage(slug: PageSlug): Promise<ContentPage | null> {
  try {
    return await api<ContentPage>(`/api/v1/pages/${slug}`, { auth: false, revalidate: TTL, tags: ["pages"] });
  } catch (e) {
    if (isApiError(e, "NOT_FOUND")) return null;
    throw e;
  }
}

/** Uncached, for the admin editor. */
export async function getPageFresh(slug: PageSlug): Promise<ContentPage | null> {
  try {
    return await api<ContentPage>(`/api/v1/pages/${slug}`, { auth: false });
  } catch (e) {
    if (isApiError(e, "NOT_FOUND")) return null;
    throw e;
  }
}
