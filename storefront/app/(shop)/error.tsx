"use client";

import { ErrorContent } from "@/components/error-content";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent reset={reset} digest={error.digest} />;
}
