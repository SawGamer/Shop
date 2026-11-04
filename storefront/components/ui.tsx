import clsx from "clsx";
import Link from "next/link";
import { discountPercent, formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/format";
import type { Money, OrderStatus } from "@/lib/types";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("mx-auto w-full max-w-[1280px] px-4 sm:px-6", className)}>{children}</div>;
}

/** Price with optional strike-through compare-at price. */
export function Price({
  price,
  compareAt,
  from = false,
  className,
}: {
  price: Money | null;
  compareAt?: Money | null;
  from?: boolean;
  className?: string;
}) {
  if (!price) return null;
  const onSale = !!compareAt && compareAt.cents > price.cents;
  return (
    <span className={clsx("tabular inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={clsx("font-semibold", onSale && "text-signal")}>
        {from && <span className="font-normal text-ink-soft">from </span>}
        {formatMoney(price)}
      </span>
      {onSale && (
        <s className="text-ink-faint" aria-label={`was ${formatMoney(compareAt)}`}>
          {formatMoney(compareAt)}
        </s>
      )}
    </span>
  );
}

/** Yellow price-tag sticker showing the saving, like the ones on a shoe box. */
export function SaleSticker({ price, compareAt, className }: { price: Money; compareAt: Money | null; className?: string }) {
  const pct = discountPercent(price, compareAt);
  if (!pct) return null;
  return (
    <span
      className={clsx(
        "tabular inline-block rounded-tag bg-sticker px-1.5 py-0.5 text-sm font-bold text-ink font-semicondensed",
        className,
      )}
    >
      −{pct}%
    </span>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-sticker/60 text-ink",
  PAID: "bg-cobalt/12 text-cobalt-deep",
  SHIPPED: "bg-ink/10 text-ink",
  DELIVERED: "bg-moss/12 text-moss",
  CANCELLED: "bg-signal/10 text-signal",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={clsx("inline-block rounded-tag px-2 py-0.5 text-sm font-semibold", STATUS_STYLE[status])}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "error" | "success" | "warning";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-control border-l-4 px-4 py-3 text-sm",
        tone === "error" && "border-signal bg-signal/8",
        tone === "success" && "border-moss bg-moss/8",
        tone === "warning" && "border-sticker bg-sticker/25",
        tone === "info" && "border-cobalt bg-cobalt/6",
        className,
      )}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={clsx(title && "mt-1", "text-ink-soft")}>{children}</div>}
    </div>
  );
}

/** Shown when the API can't be reached, instead of crashing the page. */
export function ServiceDown({ what = "this page" }: { what?: string }) {
  return (
    <Notice tone="warning" title={`We can't load ${what} right now`}>
      The shop service isn&apos;t responding. Refresh the page in a moment.
    </Notice>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-control bg-cloud px-6 py-12 text-left sm:px-10">
      <h2 className="headline text-2xl">{title}</h2>
      {children && <div className="mt-3 max-w-prose text-ink-soft">{children}</div>}
      {action && (
        <Link href={action.href} className="btn btn-ink mt-6">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="headline text-3xl sm:text-4xl">{children}</h1>
      {sub && <p className="mt-2 text-ink-soft">{sub}</p>}
    </div>
  );
}

/** Product photo, or a typographic placeholder when there is none. */
export function ProductImage({
  src,
  alt,
  name,
  className,
  sizes = "md",
}: {
  src: string | null | undefined;
  alt: string;
  name: string;
  className?: string;
  sizes?: "sm" | "md" | "lg";
}) {
  if (src) {
    return (
      // Images are served by object storage / a CDN, so a plain img is intended.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading="lazy" className={clsx("h-full w-full object-cover", className)} />
    );
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      role="img"
      aria-label={alt}
      className={clsx("flex h-full w-full items-center justify-center bg-mist text-ink-faint", className)}
    >
      <span
        className={clsx(
          "headline select-none",
          sizes === "sm" && "text-xl",
          sizes === "md" && "text-4xl",
          sizes === "lg" && "text-[8rem] leading-none",
        )}
      >
        {initials || "Z&A"}
      </span>
    </div>
  );
}
