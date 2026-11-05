"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "./forms";
import { Notice } from "./ui";
import { forgotPassword, login, register, resendVerification, resetPassword, verifyEmail } from "@/lib/actions/auth";
import { IDLE } from "@/lib/action-state";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(login, IDLE);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.status === "error" && !Object.keys(fe).length && <Notice tone="error" title={state.message} />}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={fe.email}
      />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required error={fe.password} />
      <p className="-mt-2 text-sm">
        <Link href="/forgot-password" className="font-semibold text-cobalt hover:underline">
          Forgot your password?
        </Link>
      </p>
      <SubmitButton className="btn btn-primary w-full text-base" pendingLabel="Logging in…">
        Log in
      </SubmitButton>
      <p className="text-sm text-ink-soft">
        New to Z&amp;A?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-cobalt hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(register, IDLE);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.status === "error" && <Notice tone="error" title={state.message} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" autoComplete="given-name" required defaultValue={v.firstName} error={fe.firstName} />
        <Field label="Last name" name="lastName" autoComplete="family-name" required defaultValue={v.lastName} error={fe.lastName} />
      </div>
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={v.email} error={fe.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={72}
        hint="At least 8 characters"
        error={fe.password}
      />
      <SubmitButton className="btn btn-primary w-full text-base" pendingLabel="Creating your account…">
        Create account
      </SubmitButton>
      <p className="text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-cobalt hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(verifyEmail, IDLE);
  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <Notice tone="success" title="Your email is verified" />
        <Link href="/account" className="btn btn-ink">
          Go to your account
        </Link>
      </div>
    );
  }
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <SubmitButton className="btn btn-primary" pendingLabel="Verifying…">
        Verify my email
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function ResendVerificationButton() {
  const [state, formAction] = useActionState(resendVerification, IDLE);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <SubmitButton className="btn btn-quiet btn-sm" pendingLabel="Sending…">
        Send a new verification link
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPassword, IDLE);
  const fe = state.fieldErrors ?? {};
  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <Notice tone="success" title="Check your inbox">
          {state.message}
        </Notice>
        <Link href="/login" className="btn btn-ink">
          Back to log in
        </Link>
      </div>
    );
  }
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && !Object.keys(fe).length && <Notice tone="error" title={state.message} />}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={fe.email}
      />
      <SubmitButton className="btn btn-primary w-full text-base" pendingLabel="Sending…">
        Send me a reset link
      </SubmitButton>
      <p className="text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-cobalt hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPassword, IDLE);
  const fe = state.fieldErrors ?? {};
  if (fe.token) {
    return (
      <div className="space-y-4">
        <Notice tone="error" title="This link has expired or was already used">
          Reset links work once and for one hour. Request a new one and use the newest email.
        </Notice>
        <Link href="/forgot-password" className="btn btn-primary">
          Request a new link
        </Link>
      </div>
    );
  }
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.status === "error" && !Object.keys(fe).length && <Notice tone="error" title={state.message} />}
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={72}
        hint="8 to 72 characters"
        error={fe.password}
      />
      <Field
        label="Repeat the new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={72}
        error={fe.confirmPassword}
      />
      <SubmitButton className="btn btn-primary w-full text-base" pendingLabel="Saving…">
        Change password
      </SubmitButton>
    </form>
  );
}
