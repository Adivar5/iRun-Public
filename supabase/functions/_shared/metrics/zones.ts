import { DEFAULT_ZONE_BOUNDS, type Stream, type ZoneSeconds } from "./types.ts";

export function zoneSeconds(s: Stream, maxHr: number, bounds = DEFAULT_ZONE_BOUNDS): ZoneSeconds | null {
  if (!s.hr || s.hr.every((h) => h == null)) return null;
  const z: ZoneSeconds = [0, 0, 0, 0, 0];
  for (let i = 1; i < s.t.length; i++) {
    const h = s.hr[i];
    if (h == null) continue;
    const idx = bounds.findIndex((b) => h / maxHr < b);
    const zone = (idx === -1 ? 4 : idx) as 0 | 1 | 2 | 3 | 4;
    z[zone] += s.t[i]! - s.t[i - 1]!;
  }
  return z;
}
