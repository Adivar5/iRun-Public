"use client";

import { useState } from "react";

import { ChartTableSheet } from "./chart-table-sheet";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function weekdayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay()]!;
}

function formatWeekKm(km: number): string {
  return String(Math.round(km * 100) / 100);
}

export function WeekBars({
  days,
  targetMinKm,
  targetMaxKm,
  todayIndex,
}: {
  days: { date: string; km: number }[];
  targetMinKm: number;
  targetMaxKm: number;
  todayIndex: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = days.reduce((sum, day) => sum + day.km, 0);
  if (total <= 0) {
    return (
      <div className="flex w-full flex-col items-start gap-1">
        <p className="text-base text-ink">No runs this week.</p>
        <p className="font-mono text-[13px] text-ink-muted">
          Target {targetMinKm} to {targetMaxKm} km
        </p>
      </div>
    );
  }
  const totalLabel = formatWeekKm(total);
  const summary = `${totalLabel} km this week, target ${targetMinKm} to ${targetMaxKm} km`;
  const cap = Math.max(total, targetMaxKm, 1);
  const bandLeft = (targetMinKm / cap) * 100;
  const bandWidth = (Math.max(targetMaxKm - targetMinKm, 0) / cap) * 100;
  const maxKm = Math.max(...days.map((day) => day.km), 1);

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <p aria-hidden="true" className="num text-base text-ink">
        {totalLabel}
        <span className="text-[13px] text-ink-muted">
          {" "}
          / {targetMinKm}-{targetMaxKm} km
        </span>
      </p>
      <div aria-hidden="true" className="relative h-1 w-full rounded-full" style={{ background: "var(--border)" }}>
        <div
          className="absolute top-0 h-1 rounded-full"
          style={{ left: `${bandLeft}%`, width: `${bandWidth}%`, background: "var(--accent)" }}
        />
      </div>
      <p className="sr-only" role="img" aria-label={summary} />
      <style>
        {`@keyframes irun-bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
          @media (prefers-reduced-motion: reduce) { .irun-bar { animation: none !important; } }`}
      </style>
      <div className="grid w-full grid-cols-7 gap-1.5">
        {days.map((day, index) => {
          const today = index === todayIndex;
          const height = day.km > 0 ? Math.max(12, (day.km / maxKm) * 100) : 0;
          return (
            <button
              key={day.date}
              type="button"
              className="flex min-h-11 min-w-0 flex-col items-center justify-end gap-1 bg-transparent"
              aria-label={`${weekdayLabel(day.date)} ${formatWeekKm(day.km)} km`}
              onClick={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <span className="num min-h-4 text-[12px] text-ink">{day.km > 0 ? formatWeekKm(day.km) : ""}</span>
              <span className="flex h-24 w-full items-end justify-center">
                <span
                  className="irun-bar block w-full max-w-8 origin-bottom rounded-t-[10px]"
                  style={{
                    height: day.km > 0 ? `${height}%` : "2px",
                    background: day.km > 0 ? (today ? "var(--accent)" : "var(--accent-text)") : "var(--border)",
                    opacity: today || day.km <= 0 ? 1 : 0.55,
                    transformBox: "fill-box",
                    transformOrigin: "center bottom",
                    animation: day.km > 0 ? "irun-bar-grow 200ms cubic-bezier(0.23, 1, 0.32, 1) both" : undefined,
                    outline: active === index ? "1px solid var(--text)" : undefined,
                  }}
                />
              </span>
              <span
                className="font-mono text-[12px]"
                style={{ color: today ? "var(--accent)" : "var(--text-muted)" }}
              >
                {weekdayLabel(day.date)}
              </span>
            </button>
          );
        })}
      </div>
      <ChartTableSheet
        title="This week"
        columns={["Day", "Date", "Kilometres"]}
        rows={days.map((day) => [weekdayLabel(day.date), day.date, formatWeekKm(day.km)])}
      />
    </div>
  );
}
