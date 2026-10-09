import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";
import { GoalRing } from "@/components/charts/goal-ring";
import { Sparkline } from "@/components/charts/sparkline";
import { VolumeBars } from "@/components/charts/volume-bars";
import { Card } from "@/components/ui/card";
import { ConfidenceDots } from "@/components/ui/confidence-dots";
import { DeltaChip } from "@/components/ui/delta-chip";
import { Icon, type IconName } from "@/components/ui/icon";
import { SourceFootnote } from "@/components/ui/source-footnote";
import type { InsightCardT } from "@/supabase/functions/_shared/insights/schema";

function typeIcon(type: InsightCardT["type"]): IconName {
  switch (type) {
    case "progress":
      return "trending-up";
    case "risk":
      return "alert-triangle";
    case "coach":
      return "lightbulb";
    default: {
      const unexpected: never = type;
      return unexpected;
    }
  }
}

function typeLabel(type: InsightCardT["type"]): string {
  switch (type) {
    case "progress":
      return "Progress";
    case "risk":
      return "Risk";
    case "coach":
      return "Coach";
    default: {
      const unexpected: never = type;
      return unexpected;
    }
  }
}

function goodOf(status: InsightCardT["status"]): boolean | null {
  switch (status) {
    case "good":
      return true;
    case "alert":
      return false;
    case "watch":
      return null;
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}

function edgeClass(status: InsightCardT["status"]): string {
  switch (status) {
    case "good":
      return "border-l-4 border-good";
    case "watch":
      return "border-l-4 border-watch";
    case "alert":
      return "border-l-4 border-alert";
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}

function formatAmount(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const digits = Math.abs(value) >= 10 ? 1 : 2;
  return value.toFixed(digits);
}

function ringPaces(card: InsightCardT): { goal: number; best: number } {
  const perSecond = /min\//i.test(card.unit) ? 60 : 1;
  const best = Math.max(1, Math.round(Math.abs(card.value) * perSecond));
  const goal = Math.max(1, Math.round(Math.abs(card.value - card.delta) * perSecond));
  return { goal, best };
}

function MiniChart({ card }: { card: InsightCardT }) {
  const kind = card.chart.kind;
  switch (kind) {
    case "line":
      return (
        <div data-chart="line">
          <Sparkline values={[card.value - card.delta, card.value]} label={card.chart.series} />
        </div>
      );
    case "bars":
      return (
        <div data-chart="bars">
          <VolumeBars
            weeks={[{ weekStart: "2026-10-05", km: Math.max(card.value, 0) }]}
            targetMinKm={0}
            targetMaxKm={Math.max(card.value, 1)}
          />
        </div>
      );
    case "ring": {
      const paces = ringPaces(card);
      const paceUnit = /s\/km|min\/km/i.test(card.unit);
      return (
        <div data-chart="ring" className="mx-auto w-28">
          <GoalRing
            effortName={card.title}
            goalPaceS={paces.goal}
            bestPaceS={paces.best}
            source={paceUnit ? "exact" : null}
            reportedPaceS={null}
          />
        </div>
      );
    }
    case "heatmap":
      return (
        <div data-chart="heatmap">
          <CalendarHeatmap
            days={[{ date: "2026-10-05", runKm: Math.max(card.value, 0), strength: false, legDay: false }]}
            daysSinceLegDay={null}
          />
        </div>
      );
    default: {
      const unexpected: never = kind;
      return unexpected;
    }
  }
}

export function InsightCard({ card, at }: { card: InsightCardT; at: string }) {
  const headingId = `insight-${card.id}`;
  return (
    <article aria-labelledby={headingId} data-status={card.status} tabIndex={-1} className="outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <Card className={edgeClass(card.status)}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-ink-muted">
              <Icon name={typeIcon(card.type)} className="size-4" />
              {typeLabel(card.type)}
            </span>
            {card.status === "alert" ? (
              <span className="inline-flex items-center gap-1 text-[13px] text-alert">
                <Icon name="alert-triangle" className="size-4" />
                Alert
              </span>
            ) : null}
          </div>
          <h2 id={headingId} className="text-base font-medium text-ink">
            {card.title}
          </h2>
          <div className="flex items-end justify-between gap-3">
            <p className="flex items-baseline gap-2">
              <span className="num text-[28px] leading-none text-ink">{formatAmount(card.value)}</span>
              <span className="text-[13px] text-ink-muted">{card.unit}</span>
            </p>
            <DeltaChip value={formatAmount(Math.abs(card.delta))} unit={card.unit} direction={card.direction} good={goodOf(card.status)} />
          </div>
          <MiniChart card={card} />
          <p className="min-w-0 break-words text-base text-ink">{card.why}</p>
          <p className="min-w-0 break-words text-base text-ink-muted">{card.action}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ConfidenceDots level={card.confidence} />
            <SourceFootnote source="Strava" at={at} />
          </div>
        </div>
      </Card>
    </article>
  );
}
