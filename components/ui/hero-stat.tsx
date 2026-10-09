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
    <div>
      <p className="text-ink">
        <span className={cn("num text-[56px] leading-none", italic && "italic")}>{value}</span>
        {unit ? <span className="ml-1 align-baseline font-mono text-[13px] text-ink-muted">{unit}</span> : null}
      </p>
      <p className="font-mono text-[13px] text-ink-muted">{label}</p>
    </div>
  );
}
