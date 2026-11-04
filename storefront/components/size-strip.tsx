import Link from "next/link";

const SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"];

/**
 * The home page's signature element: a size grid styled like the label on the
 * end of a shoe box. Each size opens search filtered to that size, in stock.
 */
export function SizeStrip() {
  return (
    <div className="rounded-tag border-2 border-ink bg-white">
      <div className="flex items-baseline justify-between border-b-2 border-ink px-4 py-2.5">
        <h2 className="font-semibold">Shop by size</h2>
        <span className="text-sm text-ink-soft">EU sizes</span>
      </div>
      <ul className="grid grid-cols-4 gap-px bg-ink/15 sm:grid-cols-6">
        {SIZES.map((size) => (
          <li key={size} className="bg-white">
            <Link
              href={`/search?size=${size}&inStock=true`}
              className="headline tabular flex h-20 items-center justify-center text-[2.6rem] leading-none transition-colors hover:bg-sticker focus-visible:bg-sticker sm:h-24 sm:text-5xl"
              aria-label={`Shoes in EU size ${size}`}
            >
              {size}
            </Link>
          </li>
        ))}
      </ul>
      <p className="border-t-2 border-ink px-4 py-2.5 text-sm text-ink-soft">
        Only pairs we can ship in that size are shown.
      </p>
    </div>
  );
}
