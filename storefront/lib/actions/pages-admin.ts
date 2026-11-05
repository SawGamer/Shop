"use server";

import { refresh, updateTag } from "next/cache";
import { api } from "@/lib/api";
import { fail, ok, str, type ActionState } from "@/lib/action-state";
import { toActionState } from "@/lib/action-errors";
import { assertAdmin } from "@/lib/auth";
import { isPageSlug } from "@/lib/legal-text";
import type { ContentPage } from "@/lib/types";

const MAX_BODY = 50_000;

/** Saves the text of a legal page. Shoppers get it on their next page view. */
export async function savePage(slug: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const title = str(fd, "title");
  // The body keeps its own line breaks and spacing; only the ends are trimmed.
  const body = ((fd.get("body") as string | null) ?? "").replace(/\r\n?/g, "\n").trim();

  const errors: Record<string, string> = {};
  if (!isPageSlug(slug)) return fail("Unknown page.");
  if (!title) errors.title = "Enter a title";
  else if (title.length > 120) errors.title = "Use at most 120 characters";
  if (body.length > MAX_BODY) errors.body = `Use at most ${MAX_BODY.toLocaleString("en-GB")} characters`;
  if (Object.keys(errors).length) return fail("Check the highlighted fields.", errors);

  try {
    await assertAdmin();
    await api<ContentPage>(`/api/v1/admin/pages/${slug}`, { method: "PUT", body: { title, body } });
  } catch (e) {
    return toActionState(e, "We couldn't save the page.");
  }
  updateTag("pages");
  refresh();
  return ok("Saved. Visitors see the new text on their next page view.");
}
