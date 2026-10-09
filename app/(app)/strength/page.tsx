import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";
import { LegDaySpacingBar } from "@/components/charts/leg-day-spacing-bar";
import { LegDayToggle } from "@/components/strength/leg-day-toggle";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getStrengthHome } from "@/lib/data/strength";
import { formatDuration, formatLocalDay } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

export default async function StrengthPage() {
  const { sessions, days, hoursSinceLegDay } = await getStrengthHome(await supabaseServer());
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[20px] font-semibold text-ink">Strength</h1>
      <LegDaySpacingBar hoursSinceLegDay={hoursSinceLegDay} nextHardSessionInH={null} />
      <CalendarHeatmap days={days} daysSinceLegDay={hoursSinceLegDay == null ? null : Math.floor(hoursSinceLegDay / 24)} />
      {sessions.length === 0 ? (
        <EmptyState title="No strength sessions yet." />
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <Card>
                <div className="flex flex-col gap-2">
                  <span className="text-base text-ink">{session.name}</span>
                  <span className="text-sm text-ink-muted">
                    {formatLocalDay(session.startAt)} · {formatDuration(session.durationS)}
                    {session.avgHr != null ? ` · ${Math.round(session.avgHr)} bpm` : ""}
                    {session.energyKcal != null ? ` · ${Math.round(session.energyKcal)} kcal` : ""}
                  </span>
                  <LegDayToggle workoutId={session.id} legDay={session.legDay} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
