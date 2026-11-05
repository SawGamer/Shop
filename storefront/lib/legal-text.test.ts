import { describe, expect, it } from "vitest";
import { isPageSlug, LEGAL_FALLBACK_TITLES, PAGE_SLUGS, parseLegalText } from "./legal-text";

describe("parseLegalText", () => {
  it("returns nothing for empty input", () => {
    expect(parseLegalText("")).toEqual([]);
    expect(parseLegalText(null)).toEqual([]);
    expect(parseLegalText(undefined)).toEqual([]);
    expect(parseLegalText("   \n \n")).toEqual([]);
  });

  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    expect(parseLegalText("Line one\nline two\n\nSecond paragraph")).toEqual([
      { type: "paragraph", lines: ["Line one", "line two"] },
      { type: "paragraph", lines: ["Second paragraph"] },
    ]);
  });

  it("collapses several blank lines and ignores trailing spaces", () => {
    expect(parseLegalText("A  \n\n\n\n\nB   ")).toEqual([
      { type: "paragraph", lines: ["A"] },
      { type: "paragraph", lines: ["B"] },
    ]);
  });

  it("turns '## ' lines into headings, also in the middle of a paragraph", () => {
    expect(parseLegalText("## Provider\nAcme GmbH\n## Contact\nmail@acme.test")).toEqual([
      { type: "heading", text: "Provider" },
      { type: "paragraph", lines: ["Acme GmbH"] },
      { type: "heading", text: "Contact" },
      { type: "paragraph", lines: ["mail@acme.test"] },
    ]);
  });

  it("needs the space after ## and a heading text", () => {
    expect(parseLegalText("##NoSpace")).toEqual([{ type: "paragraph", lines: ["##NoSpace"] }]);
    expect(parseLegalText("## \ntext")).toEqual([{ type: "paragraph", lines: ["text"] }]);
    expect(parseLegalText("### Deeper")).toEqual([{ type: "paragraph", lines: ["### Deeper"] }]);
  });

  it("understands Windows line endings", () => {
    expect(parseLegalText("## Title\r\n\r\nBody\r\nmore")).toEqual([
      { type: "heading", text: "Title" },
      { type: "paragraph", lines: ["Body", "more"] },
    ]);
  });

  it("never interprets HTML: markup stays literal text for the renderer to escape", () => {
    const blocks = parseLegalText('## <img src=x onerror=alert(1)>\n<script>alert("x")</script> & <b>bold</b>');
    expect(blocks).toEqual([
      { type: "heading", text: "<img src=x onerror=alert(1)>" },
      { type: "paragraph", lines: ['<script>alert("x")</script> & <b>bold</b>'] },
    ]);
  });
});

describe("page slugs", () => {
  it("knows the four legal pages and their fallback titles", () => {
    expect(PAGE_SLUGS).toEqual(["imprint", "terms", "privacy", "returns"]);
    for (const slug of PAGE_SLUGS) {
      expect(isPageSlug(slug)).toBe(true);
      expect(LEGAL_FALLBACK_TITLES[slug]).toBeTruthy();
    }
    expect(isPageSlug("admin")).toBe(false);
    expect(isPageSlug("")).toBe(false);
  });
});
