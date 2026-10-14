// built to spec
import { Suspense, type ReactNode } from "react";

import { ShellTabs } from "@/app/(app)/runs/runs-client";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { TabStage } from "@/components/ui/tab-stage";
import { TopBar } from "@/components/ui/top-bar";
import { getSyncState } from "@/lib/data/sync";
import { supabaseServer } from "@/lib/supabase/server";

function TabFallback() {
  return (
    <div aria-hidden className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-shell px-4">
        <div className="mb-3 h-16 rounded-full border border-line bg-surface-1" />
      </div>
    </div>
  );
}

async function SyncTopBar() {
  const sync = await getSyncState(await supabaseServer());
  return <TopBar sync={sync} />;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PullToRefresh />
      <Suspense fallback={<TopBar />}>
        <SyncTopBar />
      </Suspense>
      <main className="mx-auto max-w-shell px-4 pt-[calc(var(--chrome-top)+env(safe-area-inset-top)+var(--gutter))] pb-[calc(var(--chrome-bottom)+env(safe-area-inset-bottom)+var(--gutter))]">
        <TabStage>{children}</TabStage>
      </main>
      <Suspense fallback={<TabFallback />}>
        <ShellTabs />
      </Suspense>
    </>
  );
}
