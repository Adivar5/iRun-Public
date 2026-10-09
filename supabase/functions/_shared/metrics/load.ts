import type { Stream } from "./types.ts";

// Banister TRIMP (coefficients 0.64 and 1.92): sum over samples of
//   minutes * HRr * 0.64 * e^(1.92 * HRr),  HRr = (HR - rest) / (max - rest), clamped to [0, 1].
// PRD 7.1: "document the formula in code".
export function hrLoad(s: Stream, restingHr: number, maxHr: number): number | null {
  if (!s.hr || s.hr.every((h) => h == null)) return null;
  let load = 0;
  for (let i = 1; i < s.t.length; i++) {
    const h = s.hr[i];
    if (h == null) continue;
    const hrr = Math.min(1, Math.max(0, (h - restingHr) / (maxHr - restingHr)));
    load += ((s.t[i]! - s.t[i - 1]!) / 60) * hrr * 0.64 * Math.exp(1.92 * hrr);
  }
  return Math.round(load * 10) / 10;
}
