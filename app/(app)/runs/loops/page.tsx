import Link from "next/link";

import { CollectingState } from "@/components/charts/collecting-state";
import { LoopCard } from "@/components/charts/loop-card";
import { RunMode } from "@/components/runs/run-mode";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listLoops } from "@/lib/data/loops";
import { supabaseServer } from "@/lib/supabase/server";

export default async function LoopsPage() {
  const loops = await listLoops(await supabaseServer());
  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Runs" />
      <RunMode mode="loops" />
      {loops.length === 0 ? (
        <EmptyState title="No loops yet. They appear after a few similar runs." />
      ) : (
        <ul className="flex flex-col gap-3">
          {loops.map((loop) => (
            <li key={loop.id}>
              {loop.attempts < 2 ? (
                <Card as="section" className="flex flex-col gap-2">
                  <h2 className="text-body font-semibold text-ink">{loop.name}</h2>
                  <CollectingState have={loop.attempts} need={2} what="runs on the same loop" />
                </Card>
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
