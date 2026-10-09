import { notFound } from "next/navigation";

import { getRunDetail } from "@/lib/data/runs";
import { supabaseServer } from "@/lib/supabase/server";

import { RunDetailClient } from "./run-detail-client";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRunDetail(await supabaseServer(), id);
  if (!run) notFound();
  return <RunDetailClient run={run} />;
}
