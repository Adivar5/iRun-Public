"use client";

import type { ComponentProps } from "react";

import { DeltaChip } from "@/components/ui/delta-chip";
import { press } from "@/components/ui/press";

import { Sparkline } from "./sparkline";

export function StatRow({
  label,
  value,
  unit,
  series,
  delta,
}: {
  label: string;
  value: string;
  unit?: string;
  series: number[];
  delta: ComponentProps<typeof DeltaChip> | null;
}) {
  const name = unit ? `${label} ${value} ${unit}` : `${label} ${value}`;
  return (
    <div role="group" aria-label={name} className={`flex w-full min-w-0 items-center justify-between gap-3 ${press}`}>
      <div className="min-w-0">
        <p className="font-mono text-[12px] text-ink-muted">{label}</p>
        <p className="text-ink">
          <span className="num text-[28px] italic leading-none">{value}</span>
          {unit ? <span className="ml-1 font-mono text-[12px] text-ink-muted">{unit}</span> : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Sparkline values={series} label={`${label} trend`} />
        {delta ? <DeltaChip {...delta} /> : null}
      </div>
    </div>
  );
}
