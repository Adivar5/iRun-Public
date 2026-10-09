"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

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

export function TabStage({ children }: { children: ReactNode }) {
  const waiting = useSyncExternalStore(subscribeTabPending, getTabPending, () => null);
  const active = currentTab(useSelectedLayoutSegment());
  if (!waiting || waiting === active) return children;
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
