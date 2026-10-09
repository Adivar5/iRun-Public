import { cn } from "@/lib/cn";

export type IconName =
  | "alert-triangle"
  | "arrow-down"
  | "arrow-up"
  | "check"
  | "clock"
  | "dumbbell"
  | "filament"
  | "gauge"
  | "lightbulb"
  | "list"
  | "plates"
  | "pulse"
  | "route"
  | "runner"
  | "loader-circle"
  | "medal"
  | "minus"
  | "notebook"
  | "plus"
  | "repeat"
  | "sneaker"
  | "settings"
  | "sun"
  | "target"
  | "trending-up"
  | "wifi-off"
  | "x";

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-5 shrink-0 bg-current", className)}
      style={{
        maskImage: `url(/icons/ui/${name}.svg)`,
        WebkitMaskImage: `url(/icons/ui/${name}.svg)`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}
