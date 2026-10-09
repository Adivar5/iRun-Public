import Link from "next/link";

import { CollectingState } from "@/components/charts/collecting-state";
import { LoopCard } from "@/components/charts/loop-card";
import { RunMode } from "@/components/runs/run-mode";
import { EmptyState } from "@/components/ui/empty-state";
import { listLoops } from "@/lib/data/loops";
import { supabaseServer } from "@/lib/supabase/server";

export default async function LoopsPage() {
  const loops = await listLoops(await supabaseServer());
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[20px] font-semibold text-ink">Runs</h1>
      <RunMode mode="loops" />
      {loops.length === 0 ? (
        <EmptyState title="No loops yet. They appear after a few similar runs." />
      ) : (
        <ul className="flex flex-col gap-3">
          {loops.map((loop) => (
            <li key={loop.id}>
              {loop.attempts < 2 ? (
                <section className="flex flex-col gap-2 rounded-card border border-line bg-surface-1 p-4">
                  <h2 className="text-base font-semibold text-ink">{loop.name}</h2>
                  <CollectingState have={loop.attempts} need={2} what="runs on the same loop" />
                </section>
              ) : (
                <Link href={`/runs/loops/${loop.id}`} className="block">
                  <LoopCard loop={loop} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
