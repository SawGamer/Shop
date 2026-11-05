import type { PageSlug } from "./types";

/**
 * The shop's legal pages (imprint, terms, privacy, returns) are written by the owner as plain text:
 * a blank line separates paragraphs and a line starting with `## ` is a heading. Nothing else is
 * interpreted, and the result is rendered as React text nodes, so HTML in the text stays literal text.
 */
export type LegalBlock = { type: "heading"; text: string } | { type: "paragraph"; lines: string[] };

export function parseLegalText(input: string | null | undefined): LegalBlock[] {
  if (!input) return [];
  const blocks: LegalBlock[] = [];
  let lines: string[] = [];
  const flush = () => {
    if (lines.length) blocks.push({ type: "paragraph", lines });
    lines = [];
  };
  for (const raw of input.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flush();
    } else if (line.startsWith("## ")) {
      flush();
      const text = line.slice(3).trim();
      if (text) blocks.push({ type: "heading", text });
    } else {
      lines.push(line);
    }
  }
  flush();
  return blocks;
}

export const PAGE_SLUGS: PageSlug[] = ["imprint", "terms", "privacy", "returns"];

/** Titles used while the API can't be reached (and as the admin's list labels). */
export const LEGAL_FALLBACK_TITLES: Record<PageSlug, string> = {
  imprint: "Imprint",
  terms: "Terms & conditions",
  privacy: "Privacy policy",
  returns: "Returns & refunds",
};

export function isPageSlug(value: string): value is PageSlug {
  return (PAGE_SLUGS as string[]).includes(value);
}
