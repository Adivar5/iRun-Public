import JSZip from "jszip";
import { parseGpx } from "./gpx";

export type ArchiveRow = {
  source: "strava";
  origin: "archive";
  source_id: string;
  type: "run" | "strength" | "other";
  start_at: string;
  duration_s: number;
  moving_s: number | null;
  distance_m: number;
  elevation_gain_m: number | null;
  has_route: boolean;
  samples: ReturnType<typeof parseGpx> | null;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const char = src[i]!;
    if (quoted) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

function jerusalemToIso(year: number, month: number, day: number, hour: number, minute: number, second: number): string {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(utcGuess)).map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return new Date(utcGuess - (asUtc - utcGuess)).toISOString();
}

function parseActivityDate(raw: string): string {
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) throw new Error("bad_date");
    return new Date(ms).toISOString();
  }
  const match = value.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/);
  if (!match) throw new Error("bad_date");
  const month = MONTHS[match[1]!.slice(0, 3).toLowerCase()];
  if (!month) throw new Error("bad_date");
  let hour = Number(match[4]);
  if (match[7] === "PM" && hour !== 12) hour += 12;
  if (match[7] === "AM" && hour === 12) hour = 0;
  return jerusalemToIso(Number(match[3]), month, Number(match[2]), hour, Number(match[5]), Number(match[6]));
}

function mapType(raw: string): ArchiveRow["type"] {
  switch (raw.trim()) {
    case "Run":
    case "TrailRun":
    case "VirtualRun":
      return "run";
    case "WeightTraining":
      return "strength";
    default:
      return "other";
  }
}

function seconds(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("bad_duration");
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map(Number);
    if (parts.some((part) => !Number.isFinite(part))) throw new Error("bad_duration");
    if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
    if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) throw new Error("bad_duration");
  return Math.round(value);
}

function optionalSeconds(raw: string): number | null {
  return raw.trim() === "" ? null : seconds(raw);
}

function kilometresToMetres(raw: string): number {
  if (raw.trim() === "") return 0;
  const km = Number(raw);
  if (!Number.isFinite(km)) throw new Error("bad_distance");
  return Math.round(km * 1000);
}

function optionalMetres(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error("bad_elevation");
  return value;
}

function isFit(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".fit") || lower.endsWith(".fit.gz");
}

export async function parseArchive(zipBytes: ArrayBuffer): Promise<{
  rows: ArchiveRow[];
  skipped: { file: string; reason: "fit_not_supported" | "no_gps" | "parse_error" }[];
}> {
  const skipped: { file: string; reason: "fit_not_supported" | "no_gps" | "parse_error" }[] = [];
  const rows: ArchiveRow[] = [];
  const zip = await JSZip.loadAsync(zipBytes);
  const csvEntry = zip.file("activities.csv");
  if (!csvEntry) return { rows, skipped: [{ file: "activities.csv", reason: "parse_error" }] };
  const table = parseCsv(await csvEntry.async("string"));
  const header = table[0];
  if (!header) return { rows, skipped: [{ file: "activities.csv", reason: "parse_error" }] };
  const column = (name: string) => header.indexOf(name);
  const required = ["Activity ID", "Activity Date", "Activity Type", "Elapsed Time", "Moving Time", "Distance", "Elevation Gain", "Filename"];
  if (required.some((name) => column(name) < 0)) return { rows, skipped: [{ file: "activities.csv", reason: "parse_error" }] };

  for (const cells of table.slice(1)) {
    const cell = (name: string) => cells[column(name)] ?? "";
    const filename = cell("Filename").trim();
    const sourceId = cell("Activity ID").trim();
    try {
      let samples: ArchiveRow["samples"] = null;
      let hasRoute = false;
      if (filename) {
        if (isFit(filename)) skipped.push({ file: filename, reason: "fit_not_supported" });
        else if (filename.toLowerCase().endsWith(".gpx")) {
          const gpxEntry = zip.file(filename);
          if (!gpxEntry) skipped.push({ file: filename, reason: "parse_error" });
          else {
            try {
              const parsed = parseGpx(await gpxEntry.async("string"));
              if (parsed.lat.length === 0) skipped.push({ file: filename, reason: "no_gps" });
              else {
                samples = parsed;
                hasRoute = true;
              }
            } catch {
              skipped.push({ file: filename, reason: "parse_error" });
            }
          }
        } else skipped.push({ file: filename, reason: "parse_error" });
      }
      rows.push({
        source: "strava",
        origin: "archive",
        source_id: sourceId,
        type: mapType(cell("Activity Type")),
        start_at: parseActivityDate(cell("Activity Date")),
        duration_s: seconds(cell("Elapsed Time")),
        moving_s: optionalSeconds(cell("Moving Time")),
        distance_m: kilometresToMetres(cell("Distance")),
        elevation_gain_m: optionalMetres(cell("Elevation Gain")),
        has_route: hasRoute,
        samples,
      });
    } catch {
      skipped.push({ file: filename || sourceId || "activities.csv", reason: "parse_error" });
    }
  }
  return { rows, skipped };
}
