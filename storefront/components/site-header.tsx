import clsx from "clsx";
import Link from "next/link";
import { getCurrentUserSafe, isAdmin } from "@/lib/auth";
import { getCartSafe, getCategories } from "@/lib/data";
import { logout } from "@/lib/actions/auth";
import { getShop } from "@/lib/shop";
import type { HeaderVariant } from "@/lib/themes/types";
import { MegaMenu } from "./mega-menu";
import { PostcodeControl } from "./postcode-control";
import { getPostcodeCookie, getZone } from "@/lib/fulfillment-data";
import { Container } from "./ui";
import type { Category, User } from "@/lib/types";

async function loadNav(): Promise<Category[]> {
  try {
    return await getCategories();
  } catch {
    return [];
  }
}

/** Class names per header design; the markup is shared so every design keeps the same accessibility. */
const STYLE: Record<
  HeaderVariant,
  {
    bar: string;
    wordmark: string;
    search: string;
    link: string;
    cart: string;
    badge: string;
    nav: string;
    navLink: string;
    sale: string;
    centered: boolean;
  }
> = {
  classic: {
    bar: "border-b border-mist bg-paper",
    wordmark: "headline text-[2rem] leading-none tracking-tight",
    search: "field max-w-md bg-white",
    link: "hover:bg-cloud",
    cart: "bg-ink text-paper hover:opacity-90",
    badge: "bg-sticker text-ink",
    nav: "text-sm",
    navLink: "font-medium text-ink-soft hover:bg-cloud hover:text-ink",
    sale: "font-semibold text-signal hover:bg-cloud",
    centered: false,
  },
  tech: {
    bar: "bg-ink text-white",
    wordmark: "headline text-[1.7rem] leading-none",
    search: "field max-w-xl border-white/15 bg-white/10 text-white placeholder:text-white/55 focus:bg-white focus:text-ink",
    link: "text-white/85 hover:bg-white/10 hover:text-white",
    cart: "bg-cobalt text-white hover:bg-cobalt-deep",
    badge: "bg-white text-ink",
    nav: "text-sm border-t border-white/10",
    navLink: "font-medium text-white/75 hover:bg-white/10 hover:text-white",
    sale: "font-semibold text-sticker hover:bg-white/10",
    centered: false,
  },
  market: {
    bar: "bg-cobalt text-white",
    wordmark: "headline text-[2rem] leading-none",
    search: "field rounded-full border-transparent bg-white py-3 pl-5 text-base shadow-sm",
    link: "text-white hover:bg-white/15",
    cart: "bg-sticker text-ink hover:brightness-95",
    badge: "bg-white text-ink",
    nav: "text-[0.95rem]",
    navLink: "font-bold text-white/90 hover:bg-white/15 hover:text-white",
    sale: "font-extrabold text-sticker hover:bg-white/15",
    centered: false,
  },
  editorial: {
    bar: "border-b border-mist bg-paper",
    wordmark: "headline text-[2.1rem] leading-none",
    search: "field max-w-sm border-0 border-b border-ink/25 bg-transparent px-0 focus:shadow-none",
    link: "hover:underline underline-offset-4",
    cart: "border border-ink text-ink hover:bg-ink hover:text-paper",
    badge: "bg-transparent text-current",
    nav: "text-xs uppercase tracking-[0.16em]",
    navLink: "text-ink-soft hover:text-ink",
    sale: "text-cobalt hover:text-cobalt-deep",
    centered: false,
  },
  boutique: {
    bar: "border-b border-mist bg-white",
    wordmark: "headline text-[2.4rem] leading-none tracking-[0.04em]",
    search: "field max-w-xs bg-paper",
    link: "hover:bg-cloud",
    cart: "bg-ink text-white hover:opacity-90",
    badge: "bg-sticker text-ink",
    nav: "text-sm tracking-wide",
    navLink: "text-ink-soft hover:text-cobalt",
    sale: "font-semibold text-cobalt hover:text-cobalt-deep",
    centered: true,
  },
};

function Wordmark({ name, logoUrl, className }: { name: string; logoUrl: string | null; className: string }) {
  return (
    <Link href="/" className={clsx("shrink-0", className)} aria-label={`${name} home`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="h-9 w-auto max-w-40 object-contain sm:h-10" />
      ) : (
        name
      )}
    </Link>
  );
}

function AccountLinks({ user, count, s }: { user: User | null; count: number; s: (typeof STYLE)[HeaderVariant] }) {
  return (
    <nav aria-label="Account" className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
      {isAdmin(user) && (
        <Link href="/admin" className={clsx("rounded-control px-2 py-2", s.link)}>
          Admin
        </Link>
      )}
      {user ? (
        <>
          <Link href="/account" className={clsx("rounded-control px-2 py-2", s.link)}>
            {user.firstName}
          </Link>
          <form action={logout}>
            <button type="submit" className={clsx("rounded-control px-2 py-2 opacity-80", s.link)}>
              Log out
            </button>
          </form>
        </>
      ) : (
        <Link href="/login" className={clsx("rounded-control px-2 py-2", s.link)}>
          Log in
        </Link>
      )}
      <Link
        href="/cart"
        className={clsx("flex items-center gap-2 rounded-control px-3 py-2 transition", s.cart)}
        aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
      >
        Cart
        <span className={clsx("tabular min-w-5 rounded-tag px-1 text-center", s.badge)}>{count}</span>
      </Link>
    </nav>
  );
}

export async function SiteHeader() {
  const [user, cart, nav, shop] = await Promise.all([getCurrentUserSafe(), getCartSafe(), loadNav(), getShop()]);
  const { theme, settings } = shop;
  const s = STYLE[theme.layout.header];
  const count = cart?.itemCount ?? 0;
  // Delivery area control, only in LOCAL fulfillment mode (slots and pickup instead of parcel shipping).
  const local = settings.fulfillmentMode === "LOCAL";
  const postcode = local ? await getPostcodeCookie() : null;
  const zone = postcode ? await getZone(postcode).catch(() => null) : null;
  const dark = theme.layout.header === "tech" || theme.layout.header === "market";
  const { searchLabel, searchPlaceholder } = theme.labels;

  const desktopSearch = (
    <form action="/search" method="get" role="search" className={clsx("hidden md:block", s.centered ? "" : "flex-1")}>
      <label htmlFor="q-desktop" className="sr-only">
        {searchLabel}
      </label>
      <input id="q-desktop" name="q" type="search" placeholder={searchPlaceholder} className={s.search} />
    </form>
  );

  return (
    <header className={s.bar}>
      {theme.copy.announcement && (
        <p className="bg-sticker px-4 py-1.5 text-center text-xs font-semibold text-ink sm:text-sm">
          {theme.copy.announcement}
        </p>
      )}

      {s.centered ? (
        <Container className="flex items-center gap-4 py-4 md:grid md:grid-cols-[1fr_auto_1fr]">
          <div className="hidden min-w-0 md:block">{desktopSearch}</div>
          <Wordmark name={settings.name} logoUrl={settings.logoUrl} className={clsx(s.wordmark, "md:text-center")} />
          <div className="ml-auto flex justify-end">
            <AccountLinks user={user} count={count} s={s} />
          </div>
        </Container>
      ) : (
        <Container
          className={clsx("flex items-center gap-4 sm:gap-6", theme.layout.header === "market" ? "py-4" : "py-3")}
        >
          <Wordmark name={settings.name} logoUrl={settings.logoUrl} className={s.wordmark} />
          {desktopSearch}
          <div className="ml-auto">
            <AccountLinks user={user} count={count} s={s} />
          </div>
        </Container>
      )}

      <Container className="pb-3 md:hidden">
        <form action="/search" method="get" role="search">
          <label htmlFor="q-mobile" className="sr-only">
            {searchLabel}
          </label>
          <input id="q-mobile" name="q" type="search" placeholder={searchLabel} className={clsx(s.search, "max-w-none")} />
        </form>
      </Container>

      {local && (
        <Container className={clsx("pb-2", s.centered && "md:text-center")}>
          <PostcodeControl postcode={postcode} zone={zone} currency={settings.currency} tone={dark ? "dark" : "light"} />
        </Container>
      )}

      {nav.length > 0 && theme.layout.megaMenu && (
        <div className={s.nav}>
          <Container>
            <MegaMenu
              categories={nav.slice(0, 8)}
              tone={dark ? "dark" : "light"}
              extras={[
                { label: "Deals of the day", href: "/search?deal=true&sort=deal_ending", tone: "sale" },
                { label: "New in", href: "/search?sort=newest" },
              ]}
            />
          </Container>
        </div>
      )}

      {nav.length > 0 && !theme.layout.megaMenu && (
        <div className={s.nav}>
          <Container>
            <nav
              aria-label="Categories"
              className={clsx("-mx-1 flex gap-1 overflow-x-auto py-1 pb-2", s.centered && "md:justify-center")}
            >
              {nav.slice(0, 6).map((c) => (
                <Link key={c.id} href={`/c/${c.slug}`} className={clsx("shrink-0 rounded-control px-2.5 py-1.5", s.navLink)}>
                  {c.name}
                </Link>
              ))}
              <Link href="/search?sort=newest" className={clsx("shrink-0 rounded-control px-2.5 py-1.5", s.navLink)}>
                New in
              </Link>
              <Link href="/search?onSale=true" className={clsx("shrink-0 rounded-control px-2.5 py-1.5", s.sale)}>
                Sale
              </Link>
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}
