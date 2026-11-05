import Link from "next/link";
import { NotFoundContent } from "@/components/not-found-content";
import { Container } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <header className="border-b border-mist">
        <Container className="py-3">
          <Link href="/" className="headline text-[2rem] leading-none">
            Z&amp;A
          </Link>
        </Container>
      </header>
      <main className="flex-1">
        <NotFoundContent />
      </main>
    </>
  );
}
