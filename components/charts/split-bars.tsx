import { ChartTableSheet, formatChartHeart, formatChartPace } from "./chart-table-sheet";
import { paceBucket } from "./geo";

export function SplitBars({
  splits,
}: {
  splits: { kmIndex: number; paceSPerKm: number; avgHr: number | null }[];
}) {
  if (splits.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="img" aria-label="No splits on this run" className="text-base text-ink">
          No splits on this run
        </p>
        <ChartTableSheet title="Splits" columns={["Km", "Pace", "Heart rate"]} rows={[]} />
      </div>
    );
  }

  const average = splits.reduce((sum, split) => sum + split.paceSPerKm, 0) / splits.length;
  const minPace = Math.min(...splits.map((split) => split.paceSPerKm));
  const maxPace = Math.max(...splits.map((split) => split.paceSPerKm), 1);
  const paceSpan = maxPace - minPace;
  const speeds = splits.map((split) => 1000 / split.paceSPerKm);
  const averageSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  const maxDeviation = Math.max(...speeds.map((speed) => Math.abs(speed - averageSpeed)), 0.01);
  const rowH = 32;
  const width = 320;
  const height = splits.length * rowH + 8;
  const barLeft = 28;
  const barRight = 232;
  const barSpan = barRight - barLeft;
  // Pace from zero makes a steady run look full. The bar is the gap from the fastest split.
  const xOf = (pace: number) => {
    const t = paceSpan === 0 ? 0.5 : (pace - minPace) / paceSpan;
    return barLeft + (0.12 + t * 0.88) * barSpan;
  };
  const averageX = xOf(average);
  const summary = `Kilometre splits, average pace ${formatChartPace(average)} per kilometre`;

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <svg role="img" aria-label={summary} viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full">
        <style>
          {`@keyframes irun-split-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
            @media (prefers-reduced-motion: reduce) { .irun-split { animation: none !important; } }`}
        </style>
        {splits.map((split, index) => {
          const bucket = paceBucket(speeds[index]!, averageSpeed - maxDeviation, averageSpeed + maxDeviation);
          const y = index * rowH + 10;
          return (
            <g key={split.kmIndex}>
              <text x="0" y={y + 12} fill="var(--text)" fontSize="12">
                {split.kmIndex}
              </text>
              <rect
                x={barLeft}
                y={y}
                width={Math.max(2, xOf(split.paceSPerKm) - barLeft)}
                height={12}
                rx={6}
                fill={`var(--pace-${bucket})`}
                className="irun-split"
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "left center",
                  animation: "irun-split-grow 200ms cubic-bezier(0.23, 1, 0.32, 1) both",
                }}
              />
              <text x="236" y={y + 12} fill="var(--text)" fontSize="12">
                {formatChartPace(split.paceSPerKm)}
              </text>
              {split.avgHr != null && Number.isFinite(split.avgHr) ? (
                <text x="276" y={y + 12} fill="var(--text-muted)" fontSize="12">
                  {Math.round(split.avgHr)}
                </text>
              ) : null}
            </g>
          );
        })}
        <line x1={averageX} x2={averageX} y1="2" y2={height - 2} stroke="var(--text)" strokeWidth="1" />
        <text x={averageX} y="11" textAnchor="middle" fill="var(--text)" fontSize="12">
          {formatChartPace(average)}
        </text>
      </svg>
      <ChartTableSheet
        title="Splits"
        columns={["Km", "Pace", "Heart rate"]}
        rows={splits.map((split) => [split.kmIndex, formatChartPace(split.paceSPerKm), formatChartHeart(split.avgHr)])}
      />
    </div>
  );
}
