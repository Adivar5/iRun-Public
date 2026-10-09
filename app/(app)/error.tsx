"use client";

import { ErrorBanner } from "@/components/ui/error-banner";

// Deliberately ignores `error`: its message can carry health data, so it is neither shown nor logged.
export default function RouteError({ retry }: { error?: Error; retry: () => void }) {
  return <ErrorBanner message="Something went wrong. Nothing was lost." onRetry={retry} />;
}
