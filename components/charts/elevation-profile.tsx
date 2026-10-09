import { ChartEmpty, ChartTableSheet } from "./chart-table-sheet";
import { seriesIndices } from "./downsample";

export function ElevationProfile({ d, alt }: { d: number[]; alt: (number | null)[] | null }) {
  const valid: { index: number; distance: number; altitude: number }[] = [];
  if (alt) {
    const count = Math.min(d.length, alt.length);
    for (let index = 0; index < count; index++) {
      const altitude = alt[index];
      if (altitude != null && Number.isFinite(altitude)) {
        valid.push({ index, distance: d[index] ?? 0, altitude });
      }
    }
  }

  if (!alt || valid.length < 2) {
    return (
      <ChartEmpty message="No elevation data">
        <ChartTableSheet title="Elevation" columns={["Distance", "Altitude"]} rows={[]} />
      </ChartEmpty>
    );
  }

  const keep = seriesIndices(
    valid.map((point) => point.distance),
    valid.map((point) => point.altitude),
    500,
  );
  const sampled = keep.map((index) => valid[index]!);
  const minAlt = Math.min(...sampled.map((point) => point.altitude));
  const maxAlt = Math.max(...sampled.map((point) => point.altitude));
  const minD = sampled[0]!.distance;
  const maxD = sampled[sampled.length - 1]!.distance;
  const width = 320;
  const height = 140;
  const padL = 8;
  const padR = 8;
  const padT = 20;
  const padB = 22;
  const spanD = maxD - minD || 1;
  const spanA = maxAlt - minAlt || 1;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const coords = sampled.map((point) => ({
    x: padL + ((point.distance - minD) / spanD) * plotW,
    y: padT + (1 - (point.altitude - minAlt) / spanA) * plotH,
    altitude: point.altitude,
    distance: point.distance,
  }));
  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join("");
  const base = padT + plotH;
  const area = `${line}L${coords[coords.length - 1]!.x.toFixed(1)} ${base}L${coords[0]!.x.toFixed(1)} ${base}Z`;
  const minPoint = coords.reduce((best, point) => (point.altitude < best.altitude ? point : best));
  const maxPoint = coords.reduce((best, point) => (point.altitude > best.altitude ? point : best));
  const summary = `Elevation from ${Math.round(minAlt)} m to ${Math.round(maxAlt)} m`;

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <svg role="img" aria-label={summary} viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full">
        <rect width={width} height={height} fill="var(--surface-1)" rx="12" />
        <path d={area} fill="var(--surface-2)" />
        <path d={line} fill="none" stroke="var(--text-muted)" strokeWidth="1.5" />
        <text x={Math.min(width - 24, Math.max(24, minPoint.x))} y={height - 4} fill="var(--text)" fontSize="12" textAnchor="middle">
          {Math.round(minAlt)} m
        </text>
        <text x={Math.min(width - 24, Math.max(24, maxPoint.x))} y="14" fill="var(--text)" fontSize="12" textAnchor="middle">
          {Math.round(maxAlt)} m
        </text>
      </svg>
      <ChartTableSheet
        title="Elevation"
        columns={["Distance", "Altitude"]}
        rows={sampled.map((point) => [`${(point.distance / 1000).toFixed(2)} km`, `${Math.round(point.altitude)} m`])}
      />
    </div>
  );
}
