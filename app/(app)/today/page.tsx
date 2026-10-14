// built to spec. 1a shows the latest run and this week. Goal and insights arrive later.
import { cache, Suspense } from "react";

import { GoalRing } from "@/components/charts/goal-ring";
import { StatRow } from "@/components/charts/stat-row";
import { WeekBars } from "@/components/charts/week-bars";
import { RouteCanvas } from "@/components/charts/route-canvas";
import { HeroRunCard } from "@/components/today/hero-run-card";
import { StrengthCard } from "@/components/today/strength-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PbChip } from "@/components/ui/pb-chip";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { latestStrength } from "@/lib/data/strength";
import { getTodayData, getTodayProgress, type GoalRingData } from "@/lib/data/today";
import { formatLocalDay } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

const loadToday = cache(async () => getTodayData(await supabaseServer()));
const loadProgress = cache(async () => getTodayProgress(await supabaseServer()));

export default function TodayPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Today" className="sr-only" />
      <Suspense
        fallback={
          <>
            <Skeleton className="h-[248px] w-full" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-40 w-full" />
          </>
        }
      >
        <TodayLead />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <TodayGoals />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-28 w-full" />}>
        <TodayEfficiency />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-28 w-full" />}>
        <TodayStrength />
      </Suspense>
    </div>
  );
}

async function HeroRoute({ id }: { id: string }) {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("workout_samples").select("lat, lon, v").eq("workout_id", id).maybeSingle();
  if (error) throw new Error("Could not load the route");
  return <RouteCanvas lat={data?.lat ?? null} lon={data?.lon ?? null} speed={data?.v ?? null} size="thumb" />;
}

async function FreshPbBadge() {
  const progress = await loadProgress();
  if (!progress.freshPb) return null;
  return (
    <div className="mt-2">
      <PbChip />
    </div>
  );
}

async function TodayLead() {
  const { hero, week, target } = await loadToday();
  const quietWeek = week.days.every((day) => day.km === 0);
  return (
    <>
      {hero ? (
        <HeroRunCard
          run={hero}
          badge={
            <Suspense fallback={null}>
              <FreshPbBadge />
            </Suspense>
          }
          route={
            <Suspense fallback={<div className="h-[88px] w-[88px]" />}>
              <HeroRoute id={hero.id} />
            </Suspense>
          }
        />
      ) : (
        <EmptyState
          title="No runs yet. Connect Strava or import your archive."
          action={{ label: "Connect Strava", href: "/settings" }}
        />
      )}
      <Section id="this-week" title="This week">
        <WeekBars days={week.days} todayIndex={week.todayIndex} targetMinKm={target.min} targetMaxKm={target.max} />
        {quietWeek ? (
          <p className="text-body text-ink">
            Week of {formatLocalDay(`${week.days[0]?.date ?? ""}T12:00:00.000Z`)}, 0 of {target.min} to {target.max} km
          </p>
        ) : null}
      </Section>
    </>
  );
}

async function TodayGoals() {
  const progress = await loadProgress();
  const ordered = [
    ...progress.goals.filter((goal) => goal.effortName === "5k" || goal.effortName === "10k"),
    ...progress.goals.filter((goal) => goal.effortName !== "5k" && goal.effortName !== "10k"),
  ];
  return (
    <Section id="goals" title="Goals">
      <Card>
        <div className="grid grid-cols-2 gap-3">
          {ordered.map((goal) => (
            <div key={goal.effortName} className="min-w-0 last:odd:col-span-2 last:odd:mx-auto last:odd:w-[calc(50%-0.375rem)]">
              <GoalBlock goal={goal} />
            </div>
          ))}
        </div>
      </Card>
    </Section>
  );
}

async function TodayEfficiency() {
  const progress = await loadProgress();
  return (
    <Section id="efficiency" title="Efficiency">
      <Card className="flex flex-col gap-4">
        <p className="text-body text-ink-muted">
          Efficiency is metres per heartbeat on easy and long runs. Higher means more ground at the same heart rate.
        </p>
        {progress.efficiency ? <StatRow {...progress.efficiency} /> : null}
        {progress.longRun ? <StatRow {...progress.longRun} /> : null}
      </Card>
    </Section>
  );
}

async function TodayStrength() {
  const strength = await latestStrength(await supabaseServer());
  return strength ? <StrengthCard session={strength} /> : <EmptyState title="No strength sessions yet." />;
}

function GoalBlock({ goal }: { goal: GoalRingData }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <h3 className="font-mono text-label text-ink-muted">{goal.effortName}</h3>
      <GoalRing
        effortName={goal.effortName}
        goalPaceS={goal.goalPaceS}
        bestPaceS={goal.bestPaceS}
        source={goal.source}
        reportedPaceS={goal.reportedPaceS}
      />
    </div>
  );
}
