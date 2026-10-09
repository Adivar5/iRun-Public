import Link from "next/link";
import { notFound } from "next/navigation";

import { LegDayToggle } from "@/components/strength/leg-day-toggle";
import { getStrengthSession } from "@/lib/data/strength";
import { formatDuration, formatLocalDay } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

export default async function StrengthSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await getStrengthSession(await supabaseServer(), id);
  if (!loaded) notFound();
  const { session } = loaded;
  const facts = [formatLocalDay(session.startAt), formatDuration(session.durationS)];
  if (session.avgHr != null) facts.push(`${Math.round(session.avgHr)} bpm`);
  if (session.energyKcal != null) facts.push(`${Math.round(session.energyKcal)} kcal`);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/strength" className="inline-flex min-h-11 items-center text-base text-accent-ink">
        All sessions
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-base font-medium text-ink">{session.name}</h1>
        <p className="text-sm text-ink-muted">{facts.join(" · ")}</p>
      </header>
      <LegDayToggle workoutId={session.id} legDay={session.legDay} />
    </div>
  );
}
