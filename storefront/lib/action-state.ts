import type { StockProblem } from "./types";

/** Result shape shared by every Server Action used with useActionState. */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  stock?: StockProblem[];
  /** Submitted values echoed back so a failed form keeps what the user typed. */
  values?: Record<string, string>;
};

export const IDLE: ActionState = { status: "idle" };

export function ok(message?: string): ActionState {
  return { status: "success", message };
}

export function fail(
  message: string,
  fieldErrors?: Record<string, string>,
  values?: Record<string, string>,
): ActionState {
  return { status: "error", message, fieldErrors, values };
}

/** Text fields of a form as a plain object (files and passwords excluded). */
export function formValues(fd: FormData, omit: string[] = ["password"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !k.startsWith("$") && !omit.includes(k)) out[k] = v;
  }
  return out;
}

/** Same as `a` but with `values` attached, for returning from a catch block. */
export function withValues(a: ActionState, values: Record<string, string>): ActionState {
  return { ...a, values };
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}
