"use client";

import { Icon } from "@/components/ui/icon";
import { press } from "@/components/ui/press";

import { useSessionFill } from "./use-session-fill";

const CAP_H = 48;

const BAR_CSS = `
@keyframes irun-space-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.irun-space-fill { transform-origin: left center; animation: irun-space-fill 400ms cubic-bezier(0.23, 1, 0.32, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .irun-space-fill { animation: none; }
}
`;

function hoursPhrase(count: number): string {
  return `${count} ${count === 1 ? "hour" : "hours"}`;
}

export function LegDaySpacingBar({
  hoursSinceLegDay,
  nextHardSessionInH,
}: {
  hoursSinceLegDay: number | null;
  nextHardSessionInH: number | null;
}) {
  const play = useSessionFill("leg-day-spacing", hoursSinceLegDay != null);
  if (hoursSinceLegDay == null) {
    return (
      <p role="img" aria-label="No leg day logged" className="text-base text-ink">
        No leg day logged
      </p>
    );
  }

  const spacing = nextHardSessionInH == null ? hoursSinceLegDay : hoursSinceLegDay + nextHardSessionInH;
  const enough = spacing >= 24;
  const summary =
    nextHardSessionInH == null
      ? `${hoursPhrase(hoursSinceLegDay)} since the last leg day, no hard session planned`
      : `${hoursPhrase(hoursSinceLegDay)} since the last leg day, next hard session in ${hoursPhrase(nextHardSessionInH)}, ${hoursPhrase(spacing)} of spacing`;
  const fill = Math.min(100, (spacing / CAP_H) * 100);
  const mark = (24 / CAP_H) * 100;
  const status = enough ? "good" : "watch";

  return (
    <div className={`flex w-full flex-col gap-2 ${press}`}>
      <style>{BAR_CSS}</style>
      <div role="img" aria-label={summary}>
        <div className="relative h-3 w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
          <div
            className={play ? "irun-space-fill h-3 rounded-full" : "h-3 rounded-full"}
            style={{ width: `${fill}%`, background: enough ? "var(--good)" : "var(--watch)" }}
          />
          <span className="absolute top-0 h-3 w-px" style={{ left: `${mark}%`, background: "var(--text)" }} />
        </div>
        <p className="mt-1 font-mono text-[12px] text-ink-muted">24 h mark</p>
      </div>
      <p data-status={status} className={`inline-flex items-center gap-1.5 text-base ${enough ? "text-good" : "text-watch"}`}>
        <Icon name={enough ? "check" : "clock"} />
        {enough ? "Enough spacing" : "Under 24 h of spacing"}
      </p>
    </div>
  );
}
