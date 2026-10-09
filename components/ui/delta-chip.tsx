// built to spec
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

const ICON: Record<"up" | "down" | "flat", IconName> = { up: "arrow-up", down: "arrow-down", flat: "minus" };

export function DeltaChip({
  value,
  unit,
  direction,
  good,
}: {
  value: string;
  unit?: string;
  direction: "up" | "down" | "flat";
  good: boolean | null;
}) {
  const base = unit ? `${direction} ${value} ${unit}` : `${direction} ${value}`;
  const name = good == null ? base : `${base}, ${good ? "better" : "worse"}`;
  return (
    <span
      role="img"
      aria-label={name}
      data-status={good == null ? undefined : good ? "good" : "alert"}
      className={cn(
        "inline-flex items-center gap-1 text-[13px]",
        good === true && "text-good",
        good === false && "text-alert",
        good == null && "text-ink-muted",
      )}
    >
      <Icon name={ICON[direction]} />
      <span className="num">{value}</span>
      {unit ? <span className="text-ink-muted">{unit}</span> : null}
    </span>
  );
}
