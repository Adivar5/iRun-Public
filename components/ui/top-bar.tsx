// built to spec
"use client";

import Link from "next/link";
import { Icon } from "./icon";
import { press } from "./press";
import { SyncPill, type SyncPillProps } from "./sync-pill";

export function TopBar({ sync }: { sync?: SyncPillProps }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b-2 border-accent bg-surface-1 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto grid h-12 max-w-[430px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4">
        {sync ? <SyncPill {...sync} /> : <span aria-hidden className="h-5 w-24 animate-pulse rounded-full bg-surface-2" />}
        <img src="/brand/irun-white.svg" alt="iRun" className="h-4 w-auto" />
        <Link
          href="/settings"
          aria-label="Settings"
          className={`ml-auto grid size-11 min-h-11 min-w-11 place-items-center text-ink hover:bg-surface-2 ${press}`}
        >
          <Icon name="settings" />
        </Link>
      </div>
    </header>
  );
}
