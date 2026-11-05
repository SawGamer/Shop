"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { COMPARE_COOKIE, COMPARE_MAX, COMPARE_META_KEY, parseCompare, serializeCompare, toggleCompare } from "@/lib/compare";

export type CompareMeta = { name: string; imageUrl: string | null };

// ---- a tiny store over the cookie, shared by every toggle and the bar ----

const EVENT = "za-compare-change";

function readCookie(): string {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${COMPARE_COOKIE}=`));
  return match ? match.slice(COMPARE_COOKIE.length + 1) : "";
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("focus", onChange);
  };
}

/** Raw cookie text: a string, so useSyncExternalStore can compare snapshots cheaply. */
function useCompareRaw(): string {
  return useSyncExternalStore(subscribe, readCookie, () => "");
}

export function useCompareList(): string[] {
  return parseCompare(useCompareRaw());
}

function readMeta(): Record<string, CompareMeta> {
  try {
    return JSON.parse(localStorage.getItem(COMPARE_META_KEY) ?? "{}") as Record<string, CompareMeta>;
  } catch {
    return {};
  }
}

function writeMeta(meta: Record<string, CompareMeta>) {
  try {
    localStorage.setItem(COMPARE_META_KEY, JSON.stringify(meta));
  } catch {
    // storage unavailable (private mode): the bar falls back to names from the slug
  }
}

export function setCompareList(slugs: string[]) {
  const value = serializeCompare(slugs);
  const maxAge = value ? 60 * 60 * 24 * 30 : 0;
  document.cookie = `${COMPARE_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  const meta = readMeta();
  for (const key of Object.keys(meta)) if (!slugs.includes(key)) delete meta[key];
  writeMeta(meta);
  window.dispatchEvent(new Event(EVENT));
}

function prettySlug(slug: string) {
  return slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// ---- toggle ----

/** "Compare" checkbox-style button for a product card or product page. */
export function CompareToggle({
  slug,
  name,
  imageUrl,
  className,
  variant = "chip",
}: {
  slug: string;
  name: string;
  imageUrl: string | null;
  className?: string;
  variant?: "chip" | "inline";
}) {
  const list = useCompareList();
  const on = list.includes(slug);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const t = setTimeout(() => setFull(false), 3000);
    return () => clearTimeout(t);
  }, [full]);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleCompare(list, slug);
    if (next.full) {
      setFull(true);
      return;
    }
    if (!on) writeMeta({ ...readMeta(), [slug]: { name, imageUrl } });
    setCompareList(next.slugs);
  }

  return (
    <span className={clsx("relative inline-flex", className)}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        aria-label={on ? `Remove ${name} from comparison` : `Compare ${name}`}
        className={clsx(
          "inline-flex items-center gap-1.5 text-xs font-semibold transition",
          variant === "chip" &&
            clsx(
              "rounded-full border px-2.5 py-1 shadow-sm",
              on ? "border-cobalt bg-cobalt text-white" : "border-mist bg-white/95 text-ink hover:border-cobalt hover:text-cobalt",
            ),
          variant === "inline" && clsx("rounded-control px-1 py-1", on ? "text-cobalt" : "text-ink-soft hover:text-cobalt"),
        )}
      >
        <span
          aria-hidden
          className={clsx(
            "flex size-3.5 items-center justify-center rounded-[3px] border",
            on ? "border-current bg-white text-cobalt" : "border-current",
          )}
        >
          {on && (
            <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M2.5 6.5l2.5 2.5 4.5-5" />
            </svg>
          )}
        </span>
        Compare
      </button>
      {full && (
        <span
          role="status"
          className="absolute right-0 top-full z-20 mt-1 w-52 rounded-control bg-ink px-3 py-2 text-xs font-medium text-paper shadow-lg"
        >
          You can compare up to {COMPARE_MAX} products. Remove one first.
        </span>
      )}
    </span>
  );
}

// ---- sticky bar ----

/** Bottom bar listing the products picked for comparison. Hidden on /compare itself. */
export function CompareBar() {
  const list = useCompareList();
  const pathname = usePathname();

  // The server snapshot is always empty, so this only renders (and reads browser storage) on the client.
  if (list.length === 0 || pathname === "/compare") return null;
  const meta = readMeta();

  return (
    <aside
      aria-label="Products to compare"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-mist bg-white/95 shadow-[0_-8px_30px_-12px_rgba(15,18,23,0.25)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-[80rem] items-center gap-3 px-4 py-3 sm:px-6">
        <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {list.map((slug) => {
            const m = meta[slug];
            return (
              <li
                key={slug}
                className="flex shrink-0 items-center gap-2 rounded-control border border-mist bg-paper py-1 pl-1 pr-1.5"
              >
                <span className="relative size-10 overflow-hidden rounded-[4px] bg-cloud">
                  {m?.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt="" className="size-full object-cover" />
                  )}
                </span>
                <span className="hidden max-w-36 truncate text-xs font-semibold sm:block">
                  {m?.name ?? prettySlug(slug)}
                </span>
                <button
                  type="button"
                  onClick={() => setCompareList(list.filter((s) => s !== slug))}
                  aria-label={`Remove ${m?.name ?? prettySlug(slug)} from comparison`}
                  className="flex size-6 items-center justify-center rounded-full text-ink-soft hover:bg-cloud hover:text-ink"
                >
                  <span aria-hidden>×</span>
                </button>
              </li>
            );
          })}
          {Array.from({ length: COMPARE_MAX - list.length }, (_, i) => (
            <li
              key={`empty-${i}`}
              aria-hidden
              className="hidden size-12 shrink-0 rounded-control border border-dashed border-mist md:block"
            />
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setCompareList([])}
          className="hidden text-sm font-semibold text-ink-soft hover:text-ink sm:block"
        >
          Clear
        </button>
        <Link href="/compare" className="btn btn-primary btn-sm shrink-0" aria-disabled={list.length < 2}>
          Compare ({list.length})
        </Link>
      </div>
    </aside>
  );
}

/** Remove button used on the /compare page itself; refreshes the server-rendered table. */
export function CompareRemove({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const list = useCompareList();
  return (
    <button
      type="button"
      onClick={() => {
        setCompareList(list.filter((s) => s !== slug));
        router.refresh();
      }}
      className="text-xs font-semibold text-ink-soft underline-offset-2 hover:text-signal hover:underline"
      aria-label={`Remove ${name} from comparison`}
    >
      Remove
    </button>
  );
}

export function CompareClear() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        setCompareList([]);
        router.refresh();
      }}
      className="btn btn-quiet btn-sm"
    >
      Clear comparison
    </button>
  );
}
