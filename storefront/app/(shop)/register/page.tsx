import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { Container } from "@/components/ui";
import { getCurrentUserSafe, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next, "/account");
  if (await getCurrentUserSafe()) redirect(next);
  return (
    <Container className="max-w-md py-14">
      <h1 className="headline text-4xl">Create an account</h1>
      <p className="mt-2 mb-8 text-ink-soft">Your cart comes with you. We&apos;ll email a link to confirm your address.</p>
      <RegisterForm next={next} />
    </Container>
  );
}
