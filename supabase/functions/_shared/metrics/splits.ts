import type { Split, Stream } from "./types.ts";

const timeAt = (s: Stream, target: number): number => {
  const i = s.d.findIndex((x) => x >= target);
  if (i <= 0) return s.t[Math.max(0, i)] ?? 0;
  const f = (target - s.d[i - 1]!) / (s.d[i]! - s.d[i - 1]! || 1);
  return s.t[i - 1]! + f * (s.t[i]! - s.t[i - 1]!);
};

export function computeSplits(s: Stream): Split[] {
  const total = s.d.at(-1) ?? 0;
  const out: Split[] = [];
  for (let k = 1; k * 1000 <= total + 1e-6; k++) {
    const t0 = timeAt(s, (k - 1) * 1000);
    const t1 = timeAt(s, k * 1000);
    let avgHr: number | null = null;
    if (s.hr) {
      const hrs = s.hr.filter((h, i) => h != null && s.t[i]! >= t0 && s.t[i]! < t1) as number[];
      avgHr = hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null;
    }
    out.push({ kmIndex: k, paceSPerKm: Math.round(t1 - t0), avgHr });
  }
  return out;
}
