import { ChartEmpty, ChartTableSheet } from "./chart-table-sheet";

const ZONE_COLOR = ["var(--z1)", "var(--z2)", "var(--z3)", "var(--z4)", "var(--z5)"] as const;
const ZONE_NAME = ["Z1", "Z2", "Z3", "Z4", "Z5"] as const;

function zoneLabel(index: number, seconds: number): string {
  return `${ZONE_NAME[index]} ${Math.round(seconds / 60)} min`;
}

export function ZoneStackBar({
  seconds,
  hasHeartRate = false,
  showTable = true,
}: {
  seconds: [number, number, number, number, number] | null;
  hasHeartRate?: boolean;
  showTable?: boolean;
}) {
  const table = showTable ? (
    <ChartTableSheet
      title="Heart rate zones"
      columns={["Zone", "Minutes"]}
      rows={seconds ? seconds.map((value, index) => [ZONE_NAME[index] ?? `Z${index + 1}`, Math.round(value / 60)]) : []}
    />
  ) : null;
  if (!seconds) {
    return (
      <ChartEmpty
        message={
          hasHeartRate
            ? "Set a max heart rate in Settings. Zones are a fraction of it."
            : "No heart rate on this run"
        }
      >
        {table}
      </ChartEmpty>
    );
  }

  const total = seconds.reduce((sum, value) => sum + value, 0);
  const parts = seconds.map((value, index) => ({
    name: ZONE_NAME[index]!,
    seconds: value,
    pct: total > 0 ? (value / total) * 100 : 0,
    label: zoneLabel(index, value),
    color: ZONE_COLOR[index]!,
  }));
  const summary = `Heart rate zones, ${parts.map((part) => part.label).join(", ")}`;

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <div role="img" aria-label={summary} className="w-full">
        <div className="flex h-8 w-full overflow-hidden rounded-btn">
          {parts.map((part) =>
            part.pct <= 0 ? null : (
              <div
                key={part.name}
                className="flex h-8 items-center justify-center overflow-hidden"
                style={{ width: `${part.pct}%`, background: part.color }}
              >
              </div>
            ),
          )}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {parts
            .filter((part) => part.seconds > 0)
            .map((part) => (
              <li key={part.name} className="text-[12px] text-ink">
                {part.label}
              </li>
            ))}
        </ul>
      </div>
      {table}
    </div>
  );
}
