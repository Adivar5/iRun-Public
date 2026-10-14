"use client";

import { useRouter, useSelectedLayoutSegment } from "next/navigation";

import { RunMode } from "@/components/runs/run-mode";
import { RunRow } from "@/components/runs/run-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { PageHeader } from "@/components/ui/page-header";
import { TabBar } from "@/components/ui/tab-bar";
import type { RunRow as RunRowData } from "@/lib/data/runs";

const TABS = ["today", "runs", "trends", "insights", "strength"] as const;
type TabKey = (typeof TABS)[number];

const FILTERS = [
  { value: "all", label: "All" },
  { value: "easy", label: "Easy" },
  { value: "tempo", label: "Tempo" },
  { value: "long", label: "Long" },
  { value: "intervals", label: "Intervals" },
] as const;

export type RunsFilter = (typeof FILTERS)[number]["value"];

function isTab(value: string | null): value is TabKey {
  return TABS.some((tab) => tab === value);
}

export function ShellTabs() {
  const segment = useSelectedLayoutSegment();
  const active: TabKey = isTab(segment) ? segment : "today";
  return <TabBar active={active} />;
}

export function RunsClient({ runs, filter }: { runs: RunRowData[]; filter: RunsFilter }) {
  const router = useRouter();

  const selected = FILTERS.find((option) => option.value === filter);

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Runs" />
      <RunMode mode="runs" />
      <FilterChips
        label="Run type"
        options={FILTERS.map((option) => ({ value: option.value, label: option.label }))}
        value={filter}
        onChange={(next) => {
          router.push(next === "all" ? "/runs" : `/runs?kind=${next}`);
        }}
      />
      <Button variant="secondary" className="self-start" onClick={() => router.refresh()}>
        Refresh
      </Button>
      {runs.length === 0 ? (
        <EmptyState
          title={
            filter === "all"
              ? "No runs yet. Connect Strava or import your archive."
              : `No ${selected?.label.toLowerCase() ?? "matching"} runs yet.`
          }
          action={
            filter === "all"
              ? { label: "Connect Strava", href: "/settings" }
              : { label: "Show all runs", href: "/runs" }
          }
        />
      ) : (
        <ul aria-label="Runs" className="flex flex-col gap-3">
          {runs.map((run) => (
            <li key={run.id}>
              <RunRow run={run} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
