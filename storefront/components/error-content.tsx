"use client";

import Link from "next/link";
import { Container } from "./ui";

export function ErrorContent({ reset, digest }: { reset: () => void; digest?: string }) {
  return (
    <Container className="py-20">
      <h1 className="headline text-3xl sm:text-4xl">This page didn&apos;t load</h1>
      <p className="mt-3 max-w-prose text-ink-soft">
        The shop service didn&apos;t answer in time or returned an error. Your cart and orders are safe. Try again,
        and if it keeps happening, come back in a few minutes.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-quiet">
          Go to the home page
        </Link>
      </div>
      {digest && <p className="mt-8 text-xs text-ink-faint">Reference: {digest}</p>}
    </Container>
  );
}
