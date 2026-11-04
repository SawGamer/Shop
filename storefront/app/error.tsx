"use client";

import { ErrorContent } from "@/components/error-content";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex-1">
      <ErrorContent reset={reset} digest={error.digest} />
    </main>
  );
}
