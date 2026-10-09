"use client";

import { projectRoute } from "@/components/charts/geo";

export function LoopOverlay({
  pb,
  chosen,
}: {
  pb: { lat: (number | null)[] | null; lon: (number | null)[] | null };
  chosen: { lat: (number | null)[] | null; lon: (number | null)[] | null };
}) {
  const pbPoints = projectRoute(pb.lat ?? [], pb.lon ?? [], 280, 160, 16);
  const chosenPoints = projectRoute(chosen.lat ?? [], chosen.lon ?? [], 280, 160, 16);
  if (pbPoints.length < 2 && chosenPoints.length < 2) return null;
  const line = (points: { x: number; y: number }[]) => points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  return (
    <svg role="img" aria-label="Personal best route dashed, this run solid" viewBox="0 0 280 160" className="block h-auto w-full">
      {pbPoints.length >= 2 ? (
        <polyline fill="none" stroke="var(--text)" strokeWidth="2" strokeDasharray="6 4" points={line(pbPoints)} />
      ) : null}
      {chosenPoints.length >= 2 ? (
        <polyline fill="none" stroke="var(--accent)" strokeWidth="2.5" points={line(chosenPoints)} />
      ) : null}
      <text x="12" y="20" fill="var(--text)" fontSize="12">
        PB, dashed
      </text>
      <text x="12" y="36" fill="var(--accent)" fontSize="12">
        This run, solid
      </text>
    </svg>
  );
}
