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

const TILE = 256;
const MAX_ZOOM = 17;
const MAX_LAT = 85.0511;

export type MapTile = { x: number; y: number; z: number; px: number; py: number; size: number };

// Web Mercator, so the route lines up with standard slippy-map tiles (OpenStreetMap and friends).
// The route is scaled to fill the box up to the margin (a fractional zoom, so it is never left
// small). Tiles come from the nearest whole zoom, so they stay sharp, and are drawn `size` px wide
// to match the fractional scale. px/py place a tile in the box.
export function projectMap(
  lat: (number | null)[],
  lon: (number | null)[],
  w: number,
  h: number,
  pad = 8,
): { points: { x: number; y: number; i: number }[]; tiles: MapTile[]; zoom: number } | null {
  const pts = lat
    .map((a, i) => ({ a, o: lon[i] ?? null, i }))
    .filter(
      (p): p is { a: number; o: number; i: number } =>
        p.a != null && p.o != null && Number.isFinite(p.a) && Number.isFinite(p.o),
    );
  if (pts.length < 2) return null;
  const wx = pts.map((p) => (p.o + 180) / 360);
  const wy = pts.map((p) => {
    const s = Math.sin((Math.min(MAX_LAT, Math.max(-MAX_LAT, p.a)) * Math.PI) / 180);
    return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  });
  const minX = Math.min(...wx);
  const maxX = Math.max(...wx);
  const minY = Math.min(...wy);
  const maxY = Math.max(...wy);
  const fit = Math.min((w - 2 * pad) / ((maxX - minX) * TILE), (h - 2 * pad) / ((maxY - minY) * TILE));
  const fractional = Math.min(MAX_ZOOM, Math.max(0, Math.log2(fit)));
  const zoom = Math.round(fractional);
  const scale = TILE * 2 ** fractional;
  const size = TILE * 2 ** (fractional - zoom);
  const left = ((minX + maxX) / 2) * scale - w / 2;
  const top = ((minY + maxY) / 2) * scale - h / 2;
  const points = pts.map((p, k) => ({ x: wx[k]! * scale - left, y: wy[k]! * scale - top, i: p.i }));
  const count = 2 ** zoom;
  const tiles: MapTile[] = [];
  for (let ty = Math.floor(top / size); ty <= Math.floor((top + h - 1) / size); ty++) {
    if (ty < 0 || ty >= count) continue;
    for (let tx = Math.floor(left / size); tx <= Math.floor((left + w - 1) / size); tx++) {
      tiles.push({ x: ((tx % count) + count) % count, y: ty, z: zoom, px: tx * size - left, py: ty * size - top, size });
    }
  }
  return { points, tiles, zoom };
}

export function paceBucket(v: number, min: number, max: number): 0 | 1 | 2 | 3 {
  const f = (v - min) / (max - min || 1);
  return Math.min(3, Math.max(0, Math.floor(f * 4))) as 0 | 1 | 2 | 3;
}
