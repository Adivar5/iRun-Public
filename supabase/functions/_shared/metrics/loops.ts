export type Signature = { lat: number[]; lon: number[]; distanceM: number };

const EARTH_M = 6_371_008.8;

export function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function signature(
  lat: (number | null)[],
  lon: (number | null)[],
  distanceM: number,
  points = 100,
): Signature | null {
  const kept: { lat: number; lon: number }[] = [];
  const n = Math.min(lat.length, lon.length);
  for (let i = 0; i < n; i++) {
    const la = lat[i];
    const lo = lon[i];
    if (la != null && lo != null) kept.push({ lat: la, lon: lo });
  }
  if (kept.length < 2) return null;
  const cum = [0];
  for (let i = 1; i < kept.length; i++) {
    const prev = kept[i - 1];
    const cur = kept[i];
    if (!prev || !cur) continue;
    cum.push(cum[i - 1]! + haversineM(prev.lat, prev.lon, cur.lat, cur.lon));
  }
  const total = cum[cum.length - 1] ?? 0;
  const outLat: number[] = [];
  const outLon: number[] = [];
  let j = 1;
  for (let i = 0; i < points; i++) {
    const target = points === 1 ? 0 : (total * i) / (points - 1);
    while (j < cum.length - 1 && (cum[j] ?? 0) < target) j++;
    const left = kept[j - 1];
    const right = kept[j] ?? left;
    const span = (cum[j] ?? 0) - (cum[j - 1] ?? 0);
    const f = !left || !right || span === 0 ? 0 : (target - (cum[j - 1] ?? 0)) / span;
    outLat.push(left && right ? left.lat + (right.lat - left.lat) * f : 0);
    outLon.push(left && right ? left.lon + (right.lon - left.lon) * f : 0);
  }
  return { lat: outLat, lon: outLon, distanceM };
}

function withinRadius(aLat: number, aLon: number, b: Signature, j: number, radiusM: number): boolean {
  return haversineM(aLat, aLon, b.lat[j]!, b.lon[j]!) <= radiusM;
}

// Any point of b inside the radius counts. Resampled laps line up, so try that index first and
// stop. A full walk only happens when the shapes do not match.
function shareWithin(a: Signature, b: Signature, radiusM: number): number {
  const n = a.lat.length;
  if (n === 0) return 0;
  const m = b.lat.length;
  let hit = 0;
  for (let i = 0; i < n; i++) {
    const aLat = a.lat[i]!;
    const aLon = a.lon[i]!;
    const center = i < m ? i : 0;
    let matched = withinRadius(aLat, aLon, b, center, radiusM);
    for (let step = 1; step < m && !matched; step++) {
      const lo = center - step;
      const hi = center + step;
      if (lo >= 0 && withinRadius(aLat, aLon, b, lo, radiusM)) matched = true;
      else if (hi < m && withinRadius(aLat, aLon, b, hi, radiusM)) matched = true;
    }
    if (matched) hit++;
  }
  return hit / n;
}

export function sameLoop(
  a: Signature,
  b: Signature,
  opts?: { overlap?: number; radiusM?: number; distTol?: number; startM?: number },
): boolean {
  const overlap = opts?.overlap ?? 0.85;
  const radiusM = opts?.radiusM ?? 60;
  const distTol = opts?.distTol ?? 0.06;
  const startM = opts?.startM ?? 100;
  const maxD = Math.max(a.distanceM, b.distanceM);
  if (maxD === 0 || Math.abs(a.distanceM - b.distanceM) / maxD > distTol) return false;
  const aLat = a.lat[0];
  const aLon = a.lon[0];
  const bLat = b.lat[0];
  const bLon = b.lon[0];
  if (aLat == null || aLon == null || bLat == null || bLon == null) return false;
  if (haversineM(aLat, aLon, bLat, bLon) > startM) return false;
  return shareWithin(a, b, radiusM) >= overlap && shareWithin(b, a, radiusM) >= overlap;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  // Upper central member. The midpoint of an even count is not a real run and misses the 6.1 km archive loop.
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export function clusterLoops(runs: { id: string; sig: Signature }[]): { members: string[]; typicalDistanceM: number }[] {
  // ponytail: O(n²) pairwise comparison, fine for hundreds of runs; switch to a start-point grid index past about 2,000 runs
  const parent = runs.map((_, index) => index);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root]!;
    let cur = i;
    while (parent[cur] !== root) {
      const next = parent[cur]!;
      parent[cur] = root;
      cur = next;
    }
    return root;
  };
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i];
      const b = runs[j];
      if (!a || !b || !sameLoop(a.sig, b.sig)) continue;
      const ra = find(i);
      const rb = find(j);
      if (ra !== rb) parent[ra] = rb;
    }
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < runs.length; i++) {
    const root = find(i);
    const group = groups.get(root) ?? [];
    group.push(i);
    groups.set(root, group);
  }
  const clusters: { members: string[]; typicalDistanceM: number }[] = [];
  for (const indexes of groups.values()) {
    if (indexes.length < 2) continue;
    const members = indexes.map((index) => runs[index]!.id);
    clusters.push({ members, typicalDistanceM: median(indexes.map((index) => runs[index]!.sig.distanceM)) });
  }
  return clusters;
}

export function closureM(sig: Signature): number {
  const last = sig.lat.length - 1;
  return haversineM(sig.lat[0] ?? 0, sig.lon[0] ?? 0, sig.lat[last] ?? 0, sig.lon[last] ?? 0);
}
