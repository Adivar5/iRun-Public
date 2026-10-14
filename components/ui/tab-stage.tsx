"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import { InsightsSkeleton } from "@/components/skeletons/insights";
import { RunsSkeleton } from "@/components/skeletons/runs";
import { StrengthSkeleton } from "@/components/skeletons/strength";
import { TodaySkeleton } from "@/components/skeletons/today";
import { TrendsSkeleton } from "@/components/skeletons/trends";

type TabKey = "today" | "runs" | "trends" | "insights" | "strength";

let pending: TabKey | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setTabPending(next: TabKey | null) {
  if (pending === next) return;
  pending = next;
  emit();
}

export function subscribeTabPending(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTabPending(): TabKey | null {
  return pending;
}

const TABS = ["today", "runs", "trends", "insights", "strength"] as const;

function currentTab(segment: string | null): (typeof TABS)[number] {
  for (const tab of TABS) {
    if (tab === segment) return tab;
  }
  return "today";
}

const SKELETON: Record<TabKey, () => ReactNode> = {
  today: TodaySkeleton,
  runs: RunsSkeleton,
  trends: TrendsSkeleton,
  insights: InsightsSkeleton,
  strength: StrengthSkeleton,
};

export function TabStage({ children }: { children: ReactNode }) {
  const waiting = useSyncExternalStore(subscribeTabPending, getTabPending, () => null);
  const active = currentTab(useSelectedLayoutSegment());
  if (!waiting || waiting === active) return children;
  const PendingSkeleton = SKELETON[waiting];
  return <PendingSkeleton />;
}
