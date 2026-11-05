import Link from "next/link";
import { getPageSummaries } from "@/lib/legal-data";
import { getShop } from "@/lib/shop";
import { Container } from "./ui";

export async function SiteFooter() {
  const [{ settings, theme }, pages] = await Promise.all([getShop(), getPageSummaries()]);
  return (
    <footer className="mt-24 bg-ink text-paper">
      <Container className="grid gap-10 py-12 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="headline text-4xl leading-none">{settings.name}</p>
          <p className="mt-3 max-w-sm text-sm text-paper/70">{settings.tagline ?? theme.copy.footerLine}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-paper/60">Shop</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/search?sort=newest" className="hover:underline">
                {theme.copy.newTitle}
              </Link>
            </li>
            <li>
              <Link href="/search?inStock=true" className="hover:underline">
                In stock now
              </Link>
            </li>
            <li>
              <Link href="/search" className="hover:underline">
                {theme.labels.allProducts}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-paper/60">Your account</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/account" className="hover:underline">
                Orders
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:underline">
                Cart
              </Link>
            </li>
            <li>
              <Link href="/register" className="hover:underline">
                Create an account
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <Container className="flex flex-col gap-3 border-t border-paper/15 py-5 text-xs text-paper/60 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {settings.name}
        </p>
        <nav aria-label="Legal">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {pages.map((p) => (
              <li key={p.slug}>
                <Link href={`/legal/${p.slug}`} className="hover:text-paper hover:underline">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </footer>
  );
}
