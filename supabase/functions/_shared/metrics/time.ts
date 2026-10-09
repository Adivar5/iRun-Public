const TZ = "Asia/Jerusalem";

export function localDate(isoUtc: string, tz = TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(isoUtc));
}

export function weekStartLocal(isoUtc: string, tz = TZ): string {
  const [y, m, d] = localDate(isoUtc, tz).split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
