// built to spec, 21st id 24882 pending
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

export type Status = "good" | "watch" | "alert";

export const STATUS_ICON: Record<Status, IconName> = {
  good: "check",
  watch: "clock",
  alert: "alert-triangle",
};

export const STATUS_TEXT: Record<Status, string> = {
  good: "text-good",
  watch: "text-watch",
  alert: "text-alert",
};

export function StatusChip({ status, label }: { status: Status; label: string }) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-label",
        STATUS_TEXT[status],
      )}
    >
      <Icon name={STATUS_ICON[status]} />
      {label}
    </span>
  );
}
