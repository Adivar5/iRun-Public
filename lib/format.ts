export function formatPace(sPerKm: number | null): string {
  if (sPerKm == null) return "–";
  const total = Math.round(sPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function clockSeconds(seconds: number): string {
  const hundredths = Math.round(seconds * 100);
  const whole = Math.floor(hundredths / 100);
  const frac = hundredths % 100;
  const base = String(whole).padStart(2, "0");
  if (frac === 0) return base;
  return `${base}.${String(frac).padStart(2, "0").replace(/0$/, "")}`;
}

export function formatDuration(s: number): string {
  let hundredths = Math.max(0, Math.round(s * 100));
  const hours = Math.floor(hundredths / 360000);
  hundredths -= hours * 360000;
  const minutes = Math.floor(hundredths / 6000);
  hundredths -= minutes * 6000;
  const ss = clockSeconds(hundredths / 100);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  return `${minutes}:${ss}`;
}

export function formatKm(m: number): string {
  return (m / 1000).toFixed(2);
}

export function formatRelative(iso: string, now?: Date): string {
  const then = new Date(iso).getTime();
  const current = (now ?? new Date()).getTime();
  const sec = Math.max(0, Math.floor((current - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function formatLocalDay(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(new Date(iso));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("weekday")} ${pick("day")} ${pick("month")}`;
}
