"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Category } from "@/lib/types";

type Extra = { label: string; href: string; tone?: "sale" };

/**
 * Department navigation for big catalogues. Desktop: a row of departments; hovering or activating one opens
 * a panel with its sub-categories in columns. Mobile: an "All departments" drawer with drill-down.
 */
export function MegaMenu({
  categories,
  extras,
  tone = "dark",
}: {
  categories: Category[];
  extras: Extra[];
  /** Colour scheme of the bar the menu sits in. */
  tone?: "dark" | "light";
}) {
  return (
    <>
      <DesktopMenu categories={categories} extras={extras} tone={tone} />
      <MobileMenu categories={categories} extras={extras} tone={tone} />
    </>
  );
}

// ───────────────────────────── desktop ─────────────────────────────

function DesktopMenu({ categories, extras, tone }: { categories: Category[]; extras: Extra[]; tone: "dark" | "light" }) {
  const [open, setOpen] = useState<string | null>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const panels = useRef<Record<string, HTMLDivElement | null>>({});
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusPanel = useRef(false);
  const pathname = usePathname();
  const baseId = useId();

  // Close when navigating.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(null);
  }, [pathname]);

  useEffect(() => {
    if (open && focusPanel.current) {
      focusPanel.current = false;
      panels.current[open]?.querySelector<HTMLElement>("a")?.focus();
    }
  }, [open]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen((current) => {
      if (current && returnFocus) buttons.current[current]?.focus();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(true);
    }
    function onPointer(e: PointerEvent) {
      const panel = open ? panels.current[open] : null;
      const button = open ? buttons.current[open] : null;
      const target = e.target as Node;
      if (!panel?.contains(target) && !button?.contains(target)) setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  const hoverOpen = (id: string | null) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(id), id ? 120 : 200);
  };

  const dark = tone === "dark";
  const item = clsx(
    "flex shrink-0 items-center gap-1 rounded-control px-2.5 py-1.5 text-sm font-medium",
    dark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-ink-soft hover:bg-cloud hover:text-ink",
  );

  return (
    <nav aria-label="Departments" className="relative hidden md:block" onMouseLeave={() => hoverOpen(null)}>
      <ul className="-mx-1 flex flex-wrap items-center gap-1 py-1 pb-2">
        {categories.map((c) => {
          const panelId = `${baseId}-${c.id}`;
          const expanded = open === c.id;
          if (c.children.length === 0) {
            return (
              <li key={c.id} onMouseEnter={() => hoverOpen(null)}>
                <Link href={`/c/${c.slug}`} className={item}>
                  {c.name}
                </Link>
              </li>
            );
          }
          return (
            <li key={c.id} onMouseEnter={() => hoverOpen(c.id)}>
              <button
                ref={(el) => {
                  buttons.current[c.id] = el;
                }}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
                    e.preventDefault();
                    focusPanel.current = true;
                    setOpen(c.id);
                  }
                }}
                className={clsx(item, expanded && (dark ? "bg-white/10 text-white" : "bg-cloud text-ink"))}
              >
                {c.name}
                <svg
                  viewBox="0 0 12 12"
                  className={clsx("size-3 transition-transform", expanded && "rotate-180")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M3 4.5l3 3 3-3" />
                </svg>
              </button>
              <div
                id={panelId}
                ref={(el) => {
                  panels.current[c.id] = el;
                }}
                hidden={!expanded}
                className="absolute inset-x-0 top-full z-30 rounded-b-tag border border-mist bg-white p-6 text-ink shadow-[0_24px_50px_-20px_rgba(15,18,23,0.35)]"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p className="headline text-xl">{c.name}</p>
                  <Link href={`/c/${c.slug}`} className="text-sm font-semibold text-cobalt hover:underline">
                    Shop all {c.name}
                  </Link>
                </div>
                <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
                  {c.children.map((child) => (
                    <div key={child.id}>
                      <Link href={`/c/${child.slug}`} className="font-semibold hover:text-cobalt">
                        {child.name}
                      </Link>
                      {child.children.length > 0 && (
                        <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                          {child.children.map((g) => (
                            <li key={g.id}>
                              <Link href={`/c/${g.slug}`} className="hover:text-cobalt">
                                {g.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
        {extras.map((x) => (
          <li key={x.href} onMouseEnter={() => hoverOpen(null)}>
            <Link
              href={x.href}
              className={clsx(item, x.tone === "sale" && (dark ? "!font-semibold !text-sticker" : "!font-semibold !text-signal"))}
            >
              {x.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ───────────────────────────── mobile ─────────────────────────────

function MobileMenu({ categories, extras, tone }: { categories: Category[]; extras: Extra[]; tone: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const [trail, setTrail] = useState<Category[]>([]);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const titleId = useId();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("button, a")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        opener.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, trail]);

  const current = trail.at(-1);
  const list = current ? current.children : categories;

  return (
    <div className="pb-2 md:hidden">
      <button
        ref={opener}
        type="button"
        onClick={() => {
          setTrail([]);
          setOpen(true);
        }}
        aria-haspopup="dialog"
        className={clsx(
          "inline-flex items-center gap-2 rounded-control px-2 py-1.5 text-sm font-semibold",
          tone === "dark" ? "text-white hover:bg-white/10" : "text-ink hover:bg-cloud",
        )}
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
        </svg>
        All departments
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            className="absolute inset-0 bg-ink/50"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 left-0 flex w-[min(22rem,88vw)] flex-col bg-white text-ink shadow-xl"
          >
            <div className="flex items-center gap-2 border-b border-mist px-4 py-3">
              {current ? (
                <button
                  type="button"
                  onClick={() => setTrail(trail.slice(0, -1))}
                  className="rounded-control px-2 py-1 text-sm font-semibold hover:bg-cloud"
                >
                  <span aria-hidden>‹</span> Back
                </button>
              ) : null}
              <p id={titleId} className="flex-1 truncate font-semibold">
                {current ? current.name : "All departments"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  opener.current?.focus();
                }}
                aria-label="Close menu"
                className="flex size-8 items-center justify-center rounded-full hover:bg-cloud"
              >
                <span aria-hidden>×</span>
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto py-2">
              {current && (
                <li>
                  <Link
                    href={`/c/${current.slug}`}
                    className="block px-4 py-3 font-semibold text-cobalt hover:bg-cloud"
                  >
                    Shop all {current.name}
                  </Link>
                </li>
              )}
              {list.map((c) => (
                <li key={c.id}>
                  {c.children.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setTrail([...trail, c])}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-cloud"
                    >
                      {c.name}
                      <span aria-hidden className="text-ink-faint">
                        ›
                      </span>
                    </button>
                  ) : (
                    <Link href={`/c/${c.slug}`} className="block px-4 py-3 hover:bg-cloud">
                      {c.name}
                    </Link>
                  )}
                </li>
              ))}
              {!current &&
                extras.map((x) => (
                  <li key={x.href}>
                    <Link
                      href={x.href}
                      className={clsx("block px-4 py-3 hover:bg-cloud", x.tone === "sale" && "font-semibold text-signal")}
                    >
                      {x.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
