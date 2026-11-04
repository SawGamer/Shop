import clsx from "clsx";
import Link from "next/link";

/** Windowed pagination. `page` is 1-based; `hrefFor` builds the link for a page. */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const items: (number | "gap")[] = [];
  list.forEach((p, i) => {
    if (i > 0 && p - list[i - 1] > 1) items.push("gap");
    items.push(p);
  });

  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center gap-1 text-sm">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className="btn btn-quiet btn-sm" rel="prev">
          Previous
        </Link>
      )}
      {items.map((it, i) =>
        it === "gap" ? (
          <span key={`gap-${i}`} className="px-2 text-ink-faint">
            …
          </span>
        ) : (
          <Link
            key={it}
            href={hrefFor(it)}
            aria-current={it === page ? "page" : undefined}
            className={clsx(
              "tabular min-w-9 rounded-control px-2 py-1.5 text-center",
              it === page ? "bg-ink text-paper" : "hover:bg-cloud",
            )}
          >
            {it}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} className="btn btn-quiet btn-sm" rel="next">
          Next
        </Link>
      )}
    </nav>
  );
}
