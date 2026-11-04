import clsx from "clsx";
import Link from "next/link";

export function AdminTitle({
  children,
  actions,
  sub,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="headline text-3xl sm:text-4xl">{children}</h1>
        {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={clsx("rounded-tag bg-white p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Horizontal tab-like filter links (status filters). */
export function FilterTabs({ items }: { items: { label: string; href: string; active: boolean }[] }) {
  return (
    <nav aria-label="Filter" className="mb-5 flex flex-wrap gap-1">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.active ? "page" : undefined}
          className={clsx(
            "rounded-control px-3 py-1.5 text-sm font-semibold",
            it.active ? "bg-ink text-paper" : "bg-white text-ink-soft hover:text-ink",
          )}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

export const th = "px-3 py-2 text-left text-xs font-semibold text-ink-soft";
export const td = "px-3 py-2.5 align-middle";
