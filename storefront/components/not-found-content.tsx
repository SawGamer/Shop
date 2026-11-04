import Link from "next/link";
import { Container } from "./ui";

export function NotFoundContent() {
  return (
    <Container className="py-20">
      <p className="headline text-[7rem] leading-none text-mist sm:text-[10rem]" aria-hidden>
        404
      </p>
      <h1 className="headline mt-2 text-3xl">This page isn&apos;t on the shelf</h1>
      <p className="mt-3 max-w-prose text-ink-soft">
        The link may be old, or the product is no longer sold. Search the shop or start from the home page.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/search" className="btn btn-primary">
          Search shoes
        </Link>
        <Link href="/" className="btn btn-quiet">
          Go to the home page
        </Link>
      </div>
    </Container>
  );
}
