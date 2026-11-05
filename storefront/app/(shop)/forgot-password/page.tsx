import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Forgot your password?", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <Container className="max-w-md py-14">
      <h1 className="headline text-4xl">Forgot your password?</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        Enter the email you signed up with and we&apos;ll send you a link to choose a new password.
      </p>
      <ForgotPasswordForm />
    </Container>
  );
}
