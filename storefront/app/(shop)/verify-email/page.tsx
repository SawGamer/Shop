import type { Metadata } from "next";
import Link from "next/link";
import { VerifyEmailForm } from "@/components/auth-forms";
import { Container, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string }> };

// Verification happens on a button press, not on page load, so link scanners
// in email clients can't use up the one-time token.
export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <Container className="max-w-md py-14">
      <h1 className="headline text-4xl">Verify your email</h1>
      {token ? (
        <>
          <p className="mt-2 mb-8 text-ink-soft">Confirm this address so order and shipping updates reach you.</p>
          <VerifyEmailForm token={token} />
        </>
      ) : (
        <Notice tone="error" className="mt-6" title="This link is incomplete">
          Open the link from your email again, or{" "}
          <Link href="/account" className="font-semibold text-cobalt hover:underline">
            send a new one from your account
          </Link>
          .
        </Notice>
      )}
    </Container>
  );
}
