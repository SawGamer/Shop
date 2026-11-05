import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { Container, Notice } from "@/components/ui";
import { getCurrentUserSafe, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

type Props = { searchParams: Promise<{ next?: string; reset?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(params.next, "/account");
  if (await getCurrentUserSafe()) redirect(next);
  return (
    <Container className="max-w-md py-14">
      <h1 className="headline text-4xl">Log in</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        {next === "/checkout" ? "Log in to check out. Your cart comes with you." : "See your orders and check out faster."}
      </p>
      {params.reset === "1" && (
        <Notice tone="success" className="mb-6" title="Your password was changed. Log in with your new password." />
      )}
      <LoginForm next={next} />
    </Container>
  );
}
