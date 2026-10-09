// 21st.dev Market Watchlist (id 22252). Date, distance, pace, split sparkline, chevron.
import Link from "next/link";

import { Sparkline } from "@/components/charts/sparkline";
import { Icon } from "@/components/ui/icon";
import { press } from "@/components/ui/press";
import { cn } from "@/lib/cn";
import type { RunRow as RunRowData } from "@/lib/data/runs";
import { formatKm, formatLocalDay, formatPace } from "@/lib/format";
import type { RunKind } from "@/supabase/functions/_shared/metrics/index.ts";

const KIND_LABEL = {
  easy: "Easy",
  tempo: "Tempo",
  long: "Long",
  intervals: "Intervals",
  other: "Other",
} as const satisfies Record<RunKind, string>;

export function RunRow({ run }: { run: RunRowData }) {
  const kind = run.runKind ? KIND_LABEL[run.runKind] : null;
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/runs/${run.id}`}
        className={cn(
          "flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-card border border-line bg-surface-1 px-3 py-2",
          press,
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base text-ink">
            <time dateTime={run.startAt}>{formatLocalDay(run.startAt)}</time>
            {kind ? <span className="text-ink-muted"> · {kind}</span> : null}
          </span>
          <span className="mt-0.5 block text-[13px] text-ink-muted">
            <span className="num text-base text-ink">{formatKm(run.distanceM)}</span>
            {" km"}
            <span className="num ml-3 text-base text-ink">{formatPace(run.paceSPerKm)}</span>
            {" /km"}
          </span>
          {run.loopName ? (
            <span
              data-testid="loop-chip"
              className="mt-1 inline-flex items-center rounded-full border border-line px-2 py-0.5 text-[13px] text-ink"
            >
              {run.loopName}
            </span>
          ) : null}
        </span>
        <Icon name="arrow-up" className="rotate-90" />
      </Link>
      <div className="shrink-0">
        <Sparkline values={run.splitsPace} label="Split pace" valueHeader="Pace" formatValue={formatPace} />
      </div>
    </div>
  );
}
