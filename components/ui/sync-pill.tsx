// built to spec, 21st id 24882 pending
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";
import { STATUS_ICON, STATUS_TEXT, type Status } from "./status-chip";

export type SyncPillProps = {
  lastSyncAt: string | null;
  state: "ok" | "failed" | "offline";
  now?: Date;
};

const HOUR = 60 * 60 * 1000;

function view(props: SyncPillProps): { status: Status; text: string; icon: IconName } {
  if (props.state === "failed") {
    const when = props.lastSyncAt ? `, ${formatRelative(props.lastSyncAt, props.now)}` : "";
    return { status: "alert", text: `Sync failed${when}`, icon: "alert-triangle" };
  }
  if (props.state === "offline") {
    return {
      status: "watch",
      icon: "wifi-off",
      text: props.lastSyncAt
        ? `Offline, showing data from ${formatRelative(props.lastSyncAt, props.now)}`
        : "Not synced yet",
    };
  }
  if (!props.lastSyncAt) return { status: "watch", text: "Not synced yet", icon: "clock" };
  const age = new Date(props.now ?? Date.now()).getTime() - new Date(props.lastSyncAt).getTime();
  const status: Status = age >= 48 * HOUR ? "alert" : age >= 24 * HOUR ? "watch" : "good";
  return { status, text: `Synced ${formatRelative(props.lastSyncAt, props.now)}`, icon: STATUS_ICON[status] };
}

export function SyncPill(props: SyncPillProps) {
  const { status, text, icon } = view(props);
  return (
    <span
      role="status"
      data-status={status}
      className={cn("inline-flex max-w-full items-center gap-1.5 text-[12px]", STATUS_TEXT[status])}
    >
      <Icon name={icon} />
      <span className="truncate">{text}</span>
    </span>
  );
}
