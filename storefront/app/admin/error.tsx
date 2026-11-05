"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl py-10">
      <h1 className="headline text-3xl">This admin page didn&apos;t load</h1>
      <p className="mt-3 text-ink-soft">
        The shop API didn&apos;t answer or returned an error. Check that the backend is running, then try again.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6">
        Try again
      </button>
      {error.digest && <p className="mt-6 text-xs text-ink-faint">Reference: {error.digest}</p>}
    </div>
  );
}
