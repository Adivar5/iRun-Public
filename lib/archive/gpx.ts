const EARTH_RADIUS_M = 6_371_000;

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

function points(doc: Document, name: string): Element[] {
  const namespaced = [...doc.getElementsByTagNameNS("*", name)];
  return namespaced.length > 0 ? namespaced : [...doc.getElementsByTagName(name)];
}

export function parseGpx(xml: string): { t: number[]; lat: number[]; lon: number[]; alt: (number | null)[]; d: number[] } {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) throw new Error("parse_error");
  const t: number[] = [];
  const lat: number[] = [];
  const lon: number[] = [];
  const alt: (number | null)[] = [];
  const d: number[] = [];
  let originMs: number | null = null;
  let previous: { lat: number; lon: number } | null = null;
  let cumulative = 0;
  for (const pt of points(doc, "trkpt")) {
    const latValue = Number(pt.getAttribute("lat"));
    const lonValue = Number(pt.getAttribute("lon"));
    const timeText = pt.getElementsByTagName("time")[0]?.textContent ?? pt.getElementsByTagNameNS("*", "time")[0]?.textContent;
    const eleText = pt.getElementsByTagName("ele")[0]?.textContent ?? pt.getElementsByTagNameNS("*", "ele")[0]?.textContent;
    const ms = timeText ? Date.parse(timeText) : Number.NaN;
    if (originMs == null && Number.isFinite(ms)) originMs = ms;
    const seconds = Number.isFinite(ms) && originMs != null ? Math.round((ms - originMs) / 1000) : 0;
    t.push(seconds);
    lat.push(latValue);
    lon.push(lonValue);
    alt.push(eleText == null || eleText.trim() === "" ? null : Number(eleText));
    if (previous) cumulative += haversine(previous.lat, previous.lon, latValue, lonValue);
    d.push(cumulative);
    previous = { lat: latValue, lon: lonValue };
  }
  return { t, lat, lon, alt, d };
}
