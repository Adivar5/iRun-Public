// built to spec, 21st id 29167 pending
import { cn } from "@/lib/cn";

export function HeroStat({
  value,
  unit,
  label,
  italic = true,
}: {
  value: string;
  unit?: string;
  label: string;
  italic?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-ink">
        <span className={cn("num font-hero text-hero", italic && "italic")}>{value}</span>
        {unit ? <span className="ml-1 align-baseline font-mono text-label text-ink-muted">{unit}</span> : null}
      </p>
      <p className="font-mono text-label text-ink-muted">{label}</p>
    </div>
  );
}
