"use client";

import { Icon } from "@/components/ui/icon";

type Day = { date: string; runKm: number; strength: boolean; legDay: boolean };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_MS = 86_400_000;

function parseUtc(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

function dayHeading(iso: string): string {
  const date = parseUtc(iso);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

function kmText(km: number): string {
  const rounded = Math.round(km * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function cellName(day: Day): string {
  const parts = [dayHeading(day.date)];
  if (day.runKm > 0) parts.push(`run ${kmText(day.runKm)} km`);
  if (day.strength) parts.push("strength");
  if (day.legDay) parts.push("leg day");
  if (parts.length === 1) parts.push("rest");
  return parts.join(", ");
}

function mondayIndex(iso: string): number {
  return (parseUtc(iso).getUTCDay() + 6) % 7;
}

function buildWeeks(days: Day[]): (Day | null)[][] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map(sorted.map((day) => [day.date, day]));
  const first = sorted[0]!;
  const lastTime = parseUtc(sorted[sorted.length - 1]!.date).getTime();
  const start = parseUtc(first.date).getTime() - mondayIndex(first.date) * DAY_MS;
  const rows: (Day | null)[][] = [];
  let row: (Day | null)[] = [];
  for (let time = start; time <= lastTime || row.length > 0; time += DAY_MS) {
    if (time > lastTime && row.length === 0) break;
    const iso = new Date(time).toISOString().slice(0, 10);
    row.push(time <= lastTime ? (byDate.get(iso) ?? null) : null);
    if (row.length === 7) {
      rows.push(row);
      row = [];
      if (time >= lastTime) break;
    }
  }
  return rows;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function CalendarHeatmap({
  days,
  daysSinceLegDay,
}: {
  days: Day[];
  daysSinceLegDay: number | null;
}) {
  if (days.length === 0) {
    return (
      <p role="img" aria-label="No activity in this range" className="text-base text-ink">
        No activity in this range
      </p>
    );
  }

  const weeks = buildWeeks(days);
  const runs = days.filter((day) => day.runKm > 0).length;
  const strength = days.filter((day) => day.strength).length;
  const summary = `Activity calendar, ${plural(runs, "run", "runs")} and ${plural(strength, "strength session", "strength sessions")} over ${plural(weeks.length, "week", "weeks")}`;
  const badge =
    daysSinceLegDay == null
      ? "No leg day logged"
      : `${daysSinceLegDay} ${daysSinceLegDay === 1 ? "day" : "days"} since leg day`;

  return (
    <div className="flex w-full max-w-full flex-col gap-3">
      <p className="inline-flex items-center gap-1.5 font-mono text-[12px] text-ink">
        <Icon name={daysSinceLegDay == null ? "alert-triangle" : "clock"} />
        {badge}
      </p>
      <table aria-label={summary} className="w-full table-fixed border-separate border-spacing-1">
        <thead>
          <tr>
            {HEADERS.map((label) => (
              <th key={label} scope="col" className="h-6 font-mono text-[12px] font-normal text-ink-muted">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={week[0]?.date ?? `pad-${weekIndex}`}>
              {week.map((day, dayIndex) =>
                day ? (
                  <td
                    key={day.date}
                    aria-label={cellName(day)}
                    className="h-11 w-11 border border-line p-0 text-center align-middle text-ink"
                    style={{
                      background:
                        day.runKm > 0
                          ? `color-mix(in srgb, var(--accent) ${Math.min(70, 18 + day.runKm * 4)}%, var(--surface-2))`
                          : "var(--surface-1)",
                    }}
                  >
                    <span className="flex h-11 w-11 flex-col items-center justify-center gap-0.5">
                      {day.runKm > 0 ? <span className="num text-[12px] leading-none">{kmText(day.runKm)}</span> : null}
                      {day.legDay ? <span className="font-mono text-[12px] leading-none">L</span> : null}
                      {day.strength ? (
                        <span data-symbol="strength" className="inline-flex">
                          <Icon name="dumbbell" className="size-3.5" />
                        </span>
                      ) : null}
                      {day.runKm <= 0 && !day.legDay && !day.strength ? (
                        <span className="font-mono text-[12px] text-ink-muted">–</span>
                      ) : null}
                    </span>
                  </td>
                ) : (
                  <td key={`empty-${weekIndex}-${dayIndex}`} className="h-11 w-11 p-0" />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
