"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { formatLocalDay } from "@/lib/format";
import type { InsightWeek } from "@/lib/data/insights";

import { InsightCard } from "./insight-card";

function RefreshForm({
  action,
  refreshesLeft,
}: {
  action: (state: { message: string | null }, formData: FormData) => Promise<{ message: string | null }>;
  refreshesLeft: number;
}) {
  const [state, formAction, pending] = useActionState(action, { message: null });
  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <Button type="submit" variant="secondary" disabled={pending}>
        {`Refresh, ${refreshesLeft} left today`}
      </Button>
      {state.message ? <p className="text-base text-ink">{state.message}</p> : null}
    </form>
  );
}

function weekCopy(status: InsightWeek["status"]): string | null {
  switch (status) {
    case "ok":
      return null;
    case "skipped":
      return "No insight this week";
    case "budget":
      return "Monthly AI budget reached";
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}

export function InsightsScreen({
  weeks,
  refreshesLeft,
  refreshAction,
}: {
  weeks: InsightWeek[];
  refreshesLeft: number;
  refreshAction?: (state: { message: string | null }, formData: FormData) => Promise<{ message: string | null }>;
}) {
  const current = weeks[0];
  const copy = current ? weekCopy(current.status) : "This week has not been written yet.";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[20px] font-semibold text-ink">Insights</h1>
        {refreshAction ? <RefreshForm action={refreshAction} refreshesLeft={refreshesLeft} /> : (
          <Button type="button" variant="secondary">
            {`Refresh, ${refreshesLeft} left today`}
          </Button>
        )}
      </div>
      {copy ? <p className="text-base text-ink">{copy}</p> : null}
      {current?.status === "ok"
        ? current.cards.map((card) => <InsightCard key={card.id} card={card} at={current.at} />)
        : null}
      {weeks.length > 0 ? (
        <ol className="flex flex-col gap-3 border-l border-line pl-4">
          {weeks.map((week) => (
            <li key={week.weekStart} className="flex flex-col gap-1">
              <span className="font-mono text-[12px] text-ink-muted">{formatLocalDay(`${week.weekStart}T12:00:00.000Z`)}</span>
              <span className="text-base text-ink">{weekCopy(week.status) ?? `${week.cards.length} cards`}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
