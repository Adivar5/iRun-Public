// built to spec, 21st id 19377 pending
import Link from "next/link";
import { press } from "./press";

const actionClass =
  `inline-flex min-h-11 min-w-11 items-center justify-center rounded-btn bg-accent-ink px-4 text-base text-on-accent hover:bg-accent ${press}`;

export function EmptyState({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href?: string; onClick?(): void };
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface-1 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
      <div aria-hidden data-slot="illustration" className="h-8 w-8 rounded-full border border-line" />
      <p className="text-base text-ink">{title}</p>
      {action?.href ? (
        <Link href={action.href} className={actionClass} onClick={action.onClick}>
          {action.label}
        </Link>
      ) : action?.onClick ? (
        <button type="button" onClick={action.onClick} className={actionClass}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
