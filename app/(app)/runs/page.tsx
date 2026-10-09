import { RunsClient, type RunsFilter } from "@/app/(app)/runs/runs-client";
import { getRuns } from "@/lib/data/runs";
import { supabaseServer } from "@/lib/supabase/server";

const FILTERS = ["all", "easy", "tempo", "long", "intervals"] as const;

function parseFilter(value: string | undefined): RunsFilter {
  for (const filter of FILTERS) {
    if (filter === value) return filter;
  }
  return "all";
}

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const filter = parseFilter(kind);
  const runs = await getRuns(await supabaseServer(), filter);
  return <RunsClient runs={runs} filter={filter} />;
}