// built to spec
import { formatRelative } from "@/lib/format";

export function SourceFootnote({ source, at, now }: { source: "Strava"; at: string; now?: Date }) {
  return (
    <p className="text-micro text-ink-muted">
      {source}, {formatRelative(at, now)}
    </p>
  );
}
