import { parseLegalText } from "@/lib/legal-text";

/**
 * Renders a legal page's plain text: paragraphs and `## ` headings only. Everything goes in as React text
 * nodes, so markup typed into the text is shown literally, never executed.
 */
export function LegalText({ text }: { text: string | null | undefined }) {
  const blocks = parseLegalText(text);
  if (blocks.length === 0) return <p className="text-ink-soft">This page has no text yet.</p>;
  return (
    <div className="space-y-4 leading-relaxed">
      {blocks.map((b, i) =>
        b.type === "heading" ? (
          <h2 key={i} className="headline !mt-8 text-2xl">
            {b.text}
          </h2>
        ) : (
          <p key={i}>
            {b.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
