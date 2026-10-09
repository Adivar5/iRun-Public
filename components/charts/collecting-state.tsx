"use client";

export function CollectingState({ have, need, what }: { have: number; need: number; what: string }) {
  const shown = Math.min(Math.max(0, have), need);
  return <p className="text-base text-ink">Collecting data, {shown} of about {need} {what}</p>;
}
