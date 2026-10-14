// Active tab is one pill that glides. Spring from 21st.dev Pill Morph Tabs (7878):
// stiffness 300, damping 28. No glass, no glow, no gradient from that component.
// Labels stay on every tab (spec 3).
"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { press } from "./press";
import { getTabPending, setTabPending, subscribeTabPending } from "./tab-stage";

const PILL = { type: "spring" as const, stiffness: 300, damping: 28 };

const TABS: { key: "today" | "runs" | "trends" | "insights" | "strength"; href: string; label: string }[] = [
  { key: "today", href: "/today", label: "Today" },
  { key: "runs", href: "/runs", label: "Runs" },
  { key: "trends", href: "/trends", label: "Trends" },
  { key: "insights", href: "/insights", label: "Insights" },
  { key: "strength", href: "/strength", label: "Strength" },
];

const pillClass = "absolute inset-x-1 top-1.5 bottom-1.5 rounded-full bg-accent shadow-[0_0_var(--glow-size)_var(--glow-accent)]";

export function TabBar({ active }: { active: (typeof TABS)[number]["key"] }) {
  const reduce = useReducedMotion();
  const pending = useSyncExternalStore(subscribeTabPending, getTabPending, () => null);
  const shown = pending ?? active;
  useEffect(() => {
    setTabPending(null);
  }, [active]);
  // Framer writes a transform the server does not. Paint a static pill first so hydration matches.
  const motionReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-shell px-4">
        <ul className="mb-3 grid h-16 grid-cols-5 rounded-full border border-line bg-surface-1">
        {TABS.map(({ key, href, label }) => {
          const on = key === shown;
          return (
            <li key={key} className="relative">
              {on ? (
                motionReady ? (
                  <motion.span
                    layoutId="tab-pill"
                    aria-hidden
                    transition={reduce ? { duration: 0 } : PILL}
                    className={pillClass}
                  />
                ) : (
                  <span aria-hidden className={pillClass} />
                )
              ) : null}
              <Link
                href={href}
                prefetch={true}
                aria-current={key === active ? "page" : undefined}
                onClick={(event) => {
                  // Modified clicks open elsewhere and never navigate this page, so they must not swap in a skeleton.
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  // Tapping back to the current tab cancels a navigation that has not landed yet.
                  setTabPending(key === active ? null : key);
                }}
                className={cn(
                  "relative z-10 flex h-full min-h-11 min-w-11 items-center justify-center font-body text-label font-medium",
                  press,
                  on ? "text-on-accent" : "text-ink-muted",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
        </ul>
      </div>
    </nav>
  );
}
