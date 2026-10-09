import type { RunKind } from "./types.ts";

// Metres per heartbeat = (m/s * 60) / bpm. Easy and long (steady) runs only (PRD 7.1).
export function efficiencyIndex(w: {
  distanceM: number;
  movingS: number | null;
  avgHr: number | null;
  runKind: RunKind | null;
}): number | null {
  if (!w.avgHr || !w.movingS || (w.runKind !== "easy" && w.runKind !== "long")) return null;
  return ((w.distanceM / w.movingS) * 60) / w.avgHr;
}
