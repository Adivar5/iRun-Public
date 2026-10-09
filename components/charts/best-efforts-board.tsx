"use client";

import { DeltaChip } from "@/components/ui/delta-chip";
import { Icon } from "@/components/ui/icon";
import { press } from "@/components/ui/press";
import { formatDuration } from "@/lib/format";

type Effort = {
  label: string;
  exactS: number | null;
  equivalentS: number | null;
  deltaS: number | null;
  isPb: boolean;
};

function effortDelta(deltaS: number) {
  if (deltaS < 0) return { value: String(Math.abs(deltaS)), unit: "s", direction: "down" as const, good: true };
  if (deltaS > 0) return { value: String(deltaS), unit: "s", direction: "up" as const, good: false };
  return { value: "0", unit: "s", direction: "flat" as const, good: null };
}

export function BestEffortsBoard({ rows }: { rows: Effort[] }) {
  if (rows.length === 0) {
    return (
      <p role="img" aria-label="No best efforts yet" className="text-base text-ink">
        No best efforts yet
      </p>
    );
  }

  const noun = rows.length === 1 ? "distance" : "distances";
  return (
    <ul aria-label={`Best efforts by distance, ${rows.length} ${noun}`} className="flex w-full flex-col">
      {rows.map((row) => (
        <li key={row.label} className={`flex min-h-11 items-center justify-between gap-3 border-t border-line py-2 ${press}`}>
          <span className="font-body text-base text-ink">{row.label}</span>
          <span className="flex items-center gap-2">
            {row.exactS != null ? <span className="num text-base text-ink">{formatDuration(row.exactS)}</span> : null}
            {row.equivalentS != null ? (
              <span className="num text-base text-ink-muted">~{formatDuration(row.equivalentS)}</span>
            ) : null}
            {row.deltaS != null ? <DeltaChip {...effortDelta(row.deltaS)} /> : null}
            {row.isPb && row.exactS != null ? (
              <span role="img" aria-label="New personal best" className="inline-flex items-center gap-1 font-mono text-base text-ink">
                <Icon name="medal" />
                PB
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
