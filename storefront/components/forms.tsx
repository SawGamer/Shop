"use client";

import clsx from "clsx";
import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import { IDLE, type ActionState } from "@/lib/action-state";

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary",
  disabled,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      name={name}
      value={value}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={clsx("text-sm", state.status === "error" ? "text-signal" : "text-moss", className)}
    >
      {state.message}
    </p>
  );
}

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">;

export function Field({ label, name, error, hint, className, ...input }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <input id={id} name={name} className="field" aria-invalid={!!error} aria-describedby={describedBy} {...input} />
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-sm text-signal">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type SelectProps = {
  label: string;
  name: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name" | "children">;

export function SelectField({ label, name, error, className, children, ...select }: SelectProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <select id={id} name={name} className="field" aria-invalid={!!error} {...select}>
        {children}
      </select>
      {error && <p className="mt-1 text-sm text-signal">{error}</p>}
    </div>
  );
}

/**
 * A form wired to a Server Action through useActionState, with an inline status line.
 * Used for the many small admin row forms.
 */
export function ActionForm({
  action,
  children,
  className,
  messageClassName,
  confirm,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  messageClassName?: string;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <FormMessage state={state} className={messageClassName} />
    </form>
  );
}
