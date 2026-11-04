import Link from "next/link";
import { getCurrentUserSafe, isAdmin } from "@/lib/auth";
import { getCartSafe, getCategories } from "@/lib/data";
import { logout } from "@/lib/actions/auth";
import { Container } from "./ui";
import type { Category } from "@/lib/types";

async function loadNav(): Promise<Category[]> {
  try {
    return (await getCategories()).slice(0, 6);
  } catch {
    return [];
  }
}

export async function SiteHeader() {
  const [user, cart, nav] = await Promise.all([getCurrentUserSafe(), getCartSafe(), loadNav()]);
  const count = cart?.itemCount ?? 0;

  return (
    <header className="border-b border-mist bg-paper">
      <Container className="flex items-center gap-4 py-3 sm:gap-6">
        <Link href="/" className="headline shrink-0 text-[2rem] leading-none tracking-tight" aria-label="Z&A home">
          Z&amp;A
        </Link>

        <form action="/search" method="get" role="search" className="hidden flex-1 md:block">
          <label htmlFor="q-desktop" className="sr-only">
            Search shoes
          </label>
          <input
            id="q-desktop"
            name="q"
            type="search"
            placeholder="Search by name, brand or style"
            className="field max-w-md bg-white"
          />
        </form>

        <nav aria-label="Account" className="ml-auto flex items-center gap-1 text-sm font-semibold sm:gap-2">
          {isAdmin(user) && (
            <Link href="/admin" className="rounded-control px-2 py-2 hover:bg-cloud">
              Admin
            </Link>
          )}
          {user ? (
            <>
              <Link href="/account" className="rounded-control px-2 py-2 hover:bg-cloud">
                {user.firstName}
              </Link>
              <form action={logout}>
                <button type="submit" className="rounded-control px-2 py-2 text-ink-soft hover:bg-cloud">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-control px-2 py-2 hover:bg-cloud">
              Log in
            </Link>
          )}
          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-control bg-ink px-3 py-2 text-paper hover:bg-[#222d52]"
            aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
          >
            Cart
            <span className="tabular min-w-5 rounded-tag bg-sticker px-1 text-center text-ink">{count}</span>
          </Link>
        </nav>
      </Container>

      <Container className="pb-3 md:hidden">
        <form action="/search" method="get" role="search">
          <label htmlFor="q-mobile" className="sr-only">
            Search shoes
          </label>
          <input id="q-mobile" name="q" type="search" placeholder="Search shoes" className="field bg-white" />
        </form>
      </Container>

      {nav.length > 0 && (
        <Container>
          <nav aria-label="Categories" className="-mx-1 flex gap-1 overflow-x-auto pb-2 text-sm">
            {nav.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="shrink-0 rounded-control px-2.5 py-1.5 font-medium text-ink-soft hover:bg-cloud hover:text-ink"
              >
                {c.name}
              </Link>
            ))}
            <Link
              href="/search?sort=newest"
              className="shrink-0 rounded-control px-2.5 py-1.5 font-medium text-ink-soft hover:bg-cloud hover:text-ink"
            >
              New in
            </Link>
            <Link
              href="/search?onSale=true"
              className="shrink-0 rounded-control px-2.5 py-1.5 font-semibold text-signal hover:bg-cloud"
            >
              Sale
            </Link>
          </nav>
        </Container>
      )}
    </header>
  );
}
