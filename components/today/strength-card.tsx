import Link from "next/link";

import { Card } from "@/components/ui/card";
import type { StrengthSession } from "@/lib/data/strength";
import { formatDuration, formatLocalDay } from "@/lib/format";

export function StrengthCard({ session }: { session: StrengthSession }) {
  const bits = [formatLocalDay(session.startAt), formatDuration(session.durationS)];
  if (session.legDay) bits.push("legs");
  if (session.avgHr != null) bits.push(`${session.avgHr} bpm`);
  if (session.energyKcal != null) bits.push(`${Math.round(session.energyKcal)} kcal`);

  return (
    <section aria-labelledby="latest-strength" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="latest-strength" className="text-base font-medium text-ink">
          Strength
        </h2>
        <Link href="/strength" className="text-sm text-accent-ink hover:text-ink">
          All sessions
        </Link>
      </div>
      <Card>
        <div className="flex flex-col gap-1">
          <span className="text-base text-ink">{session.name}</span>
          <span className="text-sm text-ink-muted">{bits.join(" · ")}</span>
        </div>
      </Card>
    </section>
  );
}
