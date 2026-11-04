import Link from "next/link";
import { Container } from "./ui";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-paper">
      <Container className="grid gap-10 py-12 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="headline text-4xl leading-none">Z&amp;A</p>
          <p className="mt-3 max-w-sm text-sm text-paper/70">
            Shoes for running, walking and everyday wear.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-paper/60">Shop</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/search?sort=newest" className="hover:underline">
                New arrivals
              </Link>
            </li>
            <li>
              <Link href="/search?inStock=true" className="hover:underline">
                In stock now
              </Link>
            </li>
            <li>
              <Link href="/search" className="hover:underline">
                All shoes
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
      <Container className="border-t border-paper/15 py-5 text-xs text-paper/50">
        © {new Date().getFullYear()} Z&amp;A
      </Container>
    </footer>
  );
}
