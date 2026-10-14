"use client";

import { useId } from "react";

import { ChartEmpty, ChartTableSheet, chartEaseStyle } from "./chart-table-sheet";
import { seriesIndices } from "./downsample";
import { paceBucket, projectMap, projectRoute } from "./geo";

type Size = "thumb" | "detail";

// OpenStreetMap standard tiles. Private single-user use; the credit link below is the attribution they ask for.
const tileUrl = (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
// Light tiles glare on the dark theme, so flip and dim them there.
const darkTiles = "[[data-theme=dark]_&]:[filter:invert(1)_hue-rotate(180deg)_brightness(0.8)_contrast(0.9)]";

const CANVAS_BOX: Record<Size, { w: number; h: number; stroke: number }> = {
  thumb: { w: 88, h: 88, stroke: 2 },
  detail: { w: 320, h: 200, stroke: 3 },
};

function canvasBox(size: Size): { w: number; h: number; stroke: number } {
  return CANVAS_BOX[size];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function RouteEnds({
  start,
  finish,
  width,
  height,
}: {
  start: { x: number; y: number };
  finish: { x: number; y: number };
  width: number;
  height: number;
}) {
  const close = Math.hypot(finish.x - start.x, finish.y - start.y) < 36;
  const startY = close ? start.y - 16 : start.y - 10;
  const finishY = close ? finish.y + 18 : finish.y + 14;
  return (
    <>
      <text
        x={clamp(start.x, 28, width - 28)}
        y={clamp(startY, 14, height - 4)}
        fill="var(--text)"
        stroke="var(--surface-1)"
        strokeWidth={3}
        paintOrder="stroke"
        fontSize="12"
        textAnchor="middle"
      >
        Start
      </text>
      <text
        x={clamp(finish.x, 22, width - 22)}
        y={clamp(finishY, 14, height - 4)}
        fill="var(--text)"
        stroke="var(--surface-1)"
        strokeWidth={3}
        paintOrder="stroke"
        fontSize="12"
        textAnchor="middle"
      >
        End
      </text>
    </>
  );
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * p;
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low]!;
  const weight = rank - low;
  return sorted[low]! * (1 - weight) + sorted[high]! * weight;
}

function keptRouteIndices(lat: (number | null)[], lon: (number | null)[]): number[] {
  const valid: number[] = [];
  const count = Math.min(lat.length, lon.length);
  for (let i = 0; i < count; i++) {
    if (lat[i] != null && lon[i] != null && Number.isFinite(lat[i]) && Number.isFinite(lon[i])) valid.push(i);
  }
  if (valid.length <= 500) return valid;
  const picked = seriesIndices(
    valid.map((i) => lon[i] as number),
    valid.map((i) => lat[i] as number),
    500,
  );
  return picked.map((index) => valid[index]!);
}

export function RouteCanvas({
  lat,
  lon,
  speed,
  size = "detail",
  activeIndex,
}: {
  lat: (number | null)[] | null;
  lon: (number | null)[] | null;
  speed: (number | null)[] | null;
  size?: Size;
  activeIndex?: number | null;
}) {
  const gridId = `route-grid${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const box = canvasBox(size);
  if (!lat || !lon) {
    return (
      <ChartEmpty message="No route recorded">
        <ChartTableSheet title="Route" columns={["Point", "Latitude", "Longitude"]} rows={[]} />
      </ChartEmpty>
    );
  }

  const keep = new Set(keptRouteIndices(lat, lon));
  const maskedLat = lat.map((value, index) => (keep.has(index) ? value : null));
  const maskedLon = lon.map((value, index) => (keep.has(index) ? value : null));
  const map = size === "detail" ? projectMap(maskedLat, maskedLon, box.w, box.h, 16) : null;
  const points = map?.points ?? projectRoute(maskedLat, maskedLon, box.w, box.h, size === "thumb" ? 10 : 16);
  if (points.length < 2) {
    return (
      <ChartEmpty message="No route recorded">
        <ChartTableSheet title="Route" columns={["Point", "Latitude", "Longitude"]} rows={[]} />
      </ChartEmpty>
    );
  }

  const speeds = (speed ?? []).filter((value): value is number => value != null && Number.isFinite(value));
  const minSpeed = percentile(speeds, 0.1);
  const maxSpeed = percentile(speeds, 0.9);
  const buckets = points.map((point) => {
    const value = speed?.[point.i];
    if (value == null || !Number.isFinite(value)) return 1 as const;
    return paceBucket(value, minSpeed, maxSpeed);
  });

  const segments: { bucket: 0 | 1 | 2 | 3; d: string }[] = [];
  for (let index = 0; index < points.length - 1; index++) {
    const bucket = buckets[index] ?? 1;
    const from = points[index]!;
    const to = points[index + 1]!;
    const command = `L${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
    const current = segments[segments.length - 1];
    if (current && current.bucket === bucket) current.d += command;
    else segments.push({ bucket, d: `M${from.x.toFixed(1)} ${from.y.toFixed(1)}${command}` });
  }

  const start = points[0]!;
  const finish = points[points.length - 1]!;
  const active =
    activeIndex == null
      ? null
      : points.reduce((best, point) =>
          Math.abs(point.i - activeIndex) < Math.abs(best.i - activeIndex) ? point : best,
        );
  const summary = "Route from the start circle to the finish square, brighter means faster";
  const rows = points.map((point, index) => [
    index + 1,
    lat[point.i]!.toFixed(5),
    lon[point.i]!.toFixed(5),
  ]);

  return (
    <div className="flex flex-col items-start gap-3">
      <svg
        role="img"
        aria-label={summary}
        width={size === "thumb" ? box.w : "100%"}
        height={box.h}
        viewBox={`0 0 ${box.w} ${box.h}`}
        // The box always matches the viewBox, so the map neither crops nor letterboxes at any shell width.
        style={map ? { aspectRatio: `${box.w} / ${box.h}`, height: "auto" } : undefined}
        className="block max-w-full overflow-hidden rounded-card"
      >
        <defs>
          <pattern id={gridId} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="var(--border)" strokeWidth="1" />
          </pattern>
        </defs>
        <style>{chartEaseStyle}</style>
        <rect width={box.w} height={box.h} fill="var(--surface-1)" />
        <rect width={box.w} height={box.h} fill={`url(#${gridId})`} />
        {map?.tiles.map((tile) => (
          <image
            key={`${tile.z}/${tile.x}/${tile.y}/${tile.px}`}
            href={tileUrl(tile.z, tile.x, tile.y)}
            x={tile.px}
            y={tile.py}
            width={tile.size + 0.5}
            height={tile.size + 0.5}
            aria-hidden="true"
            className={darkTiles}
          />
        ))}
        {map ? (
          <path
            d={points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join("")}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={box.stroke + 3}
            strokeOpacity={0.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {segments.map((segment, index) => (
          <path
            key={`${index}-${segment.bucket}`}
            d={segment.d}
            fill="none"
            stroke={`var(--pace-${segment.bucket})`}
            strokeWidth={box.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <circle cx={start.x} cy={start.y} r={4} fill="none" stroke="var(--text)" strokeWidth="1.5" />
        <rect x={finish.x - 3.5} y={finish.y - 3.5} width={7} height={7} fill="var(--text)" />
        {active ? (
          <circle
            data-route-dot=""
            className="irun-ease"
            r={5}
            fill="var(--text)"
            style={{
              transformBox: "view-box",
              transformOrigin: "0 0",
              transform: `translate(${active.x}px, ${active.y}px)`,
            }}
          />
        ) : null}
        {size === "detail" ? (
          <RouteEnds start={start} finish={finish} width={box.w} height={box.h} />
        ) : null}
      </svg>
      {size === "detail" ? (
        <p className="flex items-center gap-2 text-micro text-ink">
          <span aria-hidden className="inline-block size-2" style={{ background: "var(--pace-0)" }} />
          Slow
          <span aria-hidden className="inline-block size-2" style={{ background: "var(--pace-3)" }} />
          Fast
        </p>
      ) : null}
      {map ? (
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="text-micro text-ink-muted underline"
        >
          © OpenStreetMap contributors
        </a>
      ) : null}
      <ChartTableSheet title="Route" columns={["Point", "Latitude", "Longitude"]} rows={rows} />
    </div>
  );
}
