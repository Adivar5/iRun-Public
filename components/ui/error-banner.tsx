// built to spec, 21st id 19161 pending
import { Icon } from "./icon";
import { press } from "./press";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?(): void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface-1 px-4 py-3 text-base text-alert shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
    >
      <span className="flex items-center gap-2">
        <Icon name="alert-triangle" />
        {message}
      </span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-btn border border-line px-3 text-ink hover:bg-surface-2 ${press}`}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
