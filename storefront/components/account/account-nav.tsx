import clsx from "clsx";
import Link from "next/link";

const LINKS = [
  { href: "/account", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/settings", label: "Settings" },
];

/** Section links shared by the account pages. */
export function AccountNav({ current }: { current: string }) {
  return (
    <nav aria-label="Account" className="mb-8 flex gap-1 overflow-x-auto border-b border-mist">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.href === current ? "page" : undefined}
          className={clsx(
            "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold",
            l.href === current ? "border-cobalt text-ink" : "border-transparent text-ink-soft hover:text-ink",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
