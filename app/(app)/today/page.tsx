// built to spec. 1a shows the latest run and this week. Goal and insights arrive later.
import { cache, Suspense } from "react";

import { GoalRing } from "@/components/charts/goal-ring";
import { StatRow } from "@/components/charts/stat-row";
import { WeekBars } from "@/components/charts/week-bars";
import { InsightStrip } from "@/components/insights/insight-strip";
import { RouteCanvas } from "@/components/charts/route-canvas";
import { HeroRunCard } from "@/components/today/hero-run-card";
import { StrengthCard } from "@/components/today/strength-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { getInsights } from "@/lib/data/insights";
import { latestStrength } from "@/lib/data/strength";
import { getTodayData, getTodayProgress, type GoalRingData } from "@/lib/data/today";
import { formatLocalDay } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

const loadToday = cache(async () => getTodayData(await supabaseServer()));
const loadProgress = cache(async () => getTodayProgress(await supabaseServer()));

export default function TodayPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Today</h1>
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
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <TodayInsight />
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
    <p className="mt-2 inline-flex items-center gap-1 text-base text-ink">
      <Icon name="medal" />
      New 5k PB
    </p>
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
      <section aria-labelledby="this-week" className="flex flex-col gap-2">
        <h2 id="this-week" className="text-base font-medium text-ink">
          This week
        </h2>
        <WeekBars days={week.days} todayIndex={week.todayIndex} targetMinKm={target.min} targetMaxKm={target.max} />
        {quietWeek ? (
          <p className="text-base text-ink">
            Week of {formatLocalDay(`${week.days[0]?.date ?? ""}T12:00:00.000Z`)}, 0 of {target.min} to {target.max} km
          </p>
        ) : null}
      </section>
    </>
  );
}

async function TodayGoals() {
  const progress = await loadProgress();
  return (
    <section aria-labelledby="goals" className="flex flex-col gap-4">
      <h2 id="goals" className="text-base font-medium text-ink">
        Goals
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {progress.goals
          .filter((goal) => goal.effortName === "5k" || goal.effortName === "10k")
          .map((goal) => (
            <GoalBlock key={goal.effortName} goal={goal} />
          ))}
        {progress.goals
          .filter((goal) => goal.effortName !== "5k" && goal.effortName !== "10k")
          .map((goal) => (
            <div key={goal.effortName} className="col-span-2 flex justify-center">
              <div className="w-[calc(50%-0.5rem)]">
                <GoalBlock goal={goal} />
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

async function TodayEfficiency() {
  const progress = await loadProgress();
  return (
    <section aria-labelledby="efficiency" className="flex flex-col gap-4">
      <h2 id="efficiency" className="sr-only">
        Efficiency
      </h2>
      <p className="text-base text-ink">
        Efficiency is metres per heartbeat on easy and long runs. Higher means more ground at the same heart rate.
      </p>
      {progress.efficiency ? <StatRow {...progress.efficiency} /> : null}
      {progress.longRun ? <StatRow {...progress.longRun} /> : null}
    </section>
  );
}

async function TodayStrength() {
  const strength = await latestStrength(await supabaseServer());
  return strength ? <StrengthCard session={strength} /> : <EmptyState title="No strength sessions yet." />;
}

async function TodayInsight() {
  const insights = await getInsights(await supabaseServer());
  const currentInsight = insights.weeks[0];
  if (currentInsight?.status !== "ok" || currentInsight.cards.length === 0) return null;
  return <InsightStrip cards={currentInsight.cards} at={currentInsight.at} />;
}

function GoalBlock({ goal }: { goal: GoalRingData }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <h3 className="font-mono text-[12px] text-ink-muted">{goal.effortName}</h3>
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
