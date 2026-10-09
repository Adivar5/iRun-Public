// Active tab is one pill that glides. Spring from 21st.dev Pill Morph Tabs (7878):
// stiffness 300, damping 28. No glass, no glow, no gradient from that component.
// Labels stay on every tab (spec 3).
"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";
import { press } from "./press";
import { getTabPending, setTabPending, subscribeTabPending } from "./tab-stage";

const PILL = { type: "spring" as const, stiffness: 300, damping: 28 };

const TABS: { key: "today" | "runs" | "trends" | "insights" | "strength"; href: string; label: string; icon: IconName }[] = [
  { key: "today", href: "/today", label: "Today", icon: "sun" },
  { key: "runs", href: "/runs", label: "Runs", icon: "runner" },
  { key: "trends", href: "/trends", label: "Trends", icon: "pulse" },
  { key: "insights", href: "/insights", label: "Insights", icon: "notebook" },
  { key: "strength", href: "/strength", label: "Strength", icon: "plates" },
];

const pillClass = "absolute inset-x-1 top-1.5 bottom-1.5 rounded-full bg-accent";

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
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto mb-3 grid h-16 max-w-[430px] grid-cols-5 rounded-[24px] border border-line bg-surface-1">
        {TABS.map(({ key, href, label, icon }) => {
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
                onClick={() => {
                  if (key !== active) setTabPending(key);
                }}
                className={cn(
                  "relative z-10 flex h-full min-h-11 min-w-11 flex-col items-center justify-center gap-1 font-body text-[12px] font-medium",
                  press,
                  on ? "text-on-accent" : "text-ink-muted",
                )}
              >
                <Icon name={icon} className="size-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
