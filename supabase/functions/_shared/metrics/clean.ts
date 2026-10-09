import { MAX_RUN_SPEED_MPS, type Stream } from "./types.ts";

// Replaces distance increments that imply an impossible speed (or go backwards) with the last
// plausible rate, then re-accumulates distance.
export function cleanStream(s: Stream): Stream {
  const d: number[] = [s.d[0] ?? 0];
  let lastRate = 0;
  for (let i = 1; i < s.t.length; i++) {
    const dt = Math.max(1, s.t[i]! - s.t[i - 1]!);
    const dd = s.d[i]! - s.d[i - 1]!;
    const ok = dd >= 0 && dd / dt <= MAX_RUN_SPEED_MPS;
    if (ok) lastRate = dd / dt;
    d.push(d[i - 1]! + (ok ? dd : lastRate * dt));
  }
  return { ...s, d };
}
