import { ChartTableSheet } from "./chart-table-sheet";
import { seriesIndices } from "./downsample";

function formatSparkValue(value: number): string {
  const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
  return String(Number(value.toFixed(digits)));
}

export function Sparkline({
  values,
  label,
  valueHeader = "Value",
  formatValue = formatSparkValue,
}: {
  values: number[];
  label: string;
  valueHeader?: string;
  formatValue?: (value: number) => string;
}) {
  const columns = ["Point", valueHeader];
  if (values.length === 0) {
    return (
      <div className="inline-flex flex-col items-start gap-3">
        <p role="img" aria-label="No data" className="text-base text-ink">
          No data
        </p>
        <ChartTableSheet title={label} columns={columns} rows={[]} />
      </div>
    );
  }

  const source = values;
  const xs = source.map((_, index) => index);
  const keep = seriesIndices(xs, source, 500);
  const sampled = keep.map((index) => source[index]!);
  const drawn = sampled.length === 1 ? [sampled[0]!, sampled[0]!] : sampled;
  const min = Math.min(...drawn);
  const max = Math.max(...drawn);
  const span = max - min || 1;
  const coords = drawn.map((value, index) => {
    const x = drawn.length === 1 ? 30 : (index / (drawn.length - 1)) * 56 + 2;
    const y = 20 - ((value - min) / span) * 16;
    return { x, y };
  });
  const last = coords[coords.length - 1]!;
  const points = coords.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const lastValue = source[source.length - 1]!;

  return (
    <div className="inline-flex flex-col items-start gap-3">
      <div className="inline-flex items-center gap-2">
        <svg role="img" aria-label={label} width={60} height={24} viewBox="0 0 60 24" className="block shrink-0">
          <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" points={points} />
          <circle
            cx={last.x}
            cy={last.y}
            r="2"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
            strokeDasharray="1 1"
          />
        </svg>
        <span className="num text-[12px] text-ink">{formatValue(lastValue)}</span>
      </div>
      <ChartTableSheet
        title={label}
        columns={columns}
        rows={keep.map((index) => [index + 1, formatValue(source[index]!)])}
      />
    </div>
  );
}
