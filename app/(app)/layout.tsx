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
    <div aria-hidden className="fixed inset-x-3 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto mb-3 h-16 max-w-[430px] rounded-[24px] border border-line bg-surface-1" />
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
      <main className="mx-auto max-w-[430px] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[calc(66px+env(safe-area-inset-top))]">
        <TabStage>{children}</TabStage>
      </main>
      <Suspense fallback={<TabFallback />}>
        <ShellTabs />
      </Suspense>
    </>
  );
}
