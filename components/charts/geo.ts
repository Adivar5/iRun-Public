export function projectRoute(
  lat: (number | null)[],
  lon: (number | null)[],
  w: number,
  h: number,
  pad = 8,
): { x: number; y: number; i: number }[] {
  const pts = lat
    .map((a, i) => ({ a, o: lon[i] ?? null, i }))
    .filter(
      (p): p is { a: number; o: number; i: number } =>
        p.a != null && p.o != null && Number.isFinite(p.a) && Number.isFinite(p.o),
    );
  if (pts.length < 2) return [];
  const midLat = (pts.reduce((s, p) => s + p.a, 0) / pts.length) * (Math.PI / 180);
  const xs = pts.map((p) => p.o * Math.cos(midLat));
  const ys = pts.map((p) => p.a);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min((w - 2 * pad) / (maxX - minX || 1), (h - 2 * pad) / (maxY - minY || 1));
  const offX = (w - (maxX - minX) * scale) / 2;
  const offY = (h - (maxY - minY) * scale) / 2;
  return pts.map((p, k) => ({
    x: offX + (xs[k]! - minX) * scale,
    y: h - (offY + (ys[k]! - minY) * scale),
    i: p.i,
  }));
}

export function paceBucket(v: number, min: number, max: number): 0 | 1 | 2 | 3 {
  const f = (v - min) / (max - min || 1);
  return Math.min(3, Math.max(0, Math.floor(f * 4))) as 0 | 1 | 2 | 3;
}
