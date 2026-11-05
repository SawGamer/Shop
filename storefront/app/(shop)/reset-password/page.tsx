import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth-forms";
import { Container, Notice } from "@/components/ui";

// The token is in the URL: keep it out of the Referer header and out of search engines.
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <Container className="max-w-md py-14">
      <h1 className="headline text-4xl">Choose a new password</h1>
      {token ? (
        <>
          <p className="mt-2 mb-8 text-ink-soft">You will be logged out everywhere and can log in with the new password.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <Notice tone="error" className="mt-6" title="This link is incomplete">
          Open the link from your email again, or{" "}
          <Link href="/forgot-password" className="font-semibold text-cobalt hover:underline">
            request a new one
          </Link>
          .
        </Notice>
      )}
    </Container>
  );
}
