import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import type { StrengthSession } from "@/lib/data/strength";
import { formatDuration, formatLocalDay } from "@/lib/format";

export function StrengthCard({ session }: { session: StrengthSession }) {
  const bits = [formatLocalDay(session.startAt), formatDuration(session.durationS)];
  if (session.legDay) bits.push("legs");
  if (session.avgHr != null) bits.push(`${session.avgHr} bpm`);
  if (session.energyKcal != null) bits.push(`${Math.round(session.energyKcal)} kcal`);

  return (
    <Section
      id="latest-strength"
      title="Strength"
      action={
        <Link href="/strength" className="inline-flex min-h-11 items-center text-label text-accent-ink hover:text-ink">
          All sessions
        </Link>
      }
    >
      <Card className="flex flex-col gap-1">
        <span className="text-body text-ink">{session.name}</span>
        <span className="text-label text-ink-muted">{bits.join(" · ")}</span>
      </Card>
    </Section>
  );
}
