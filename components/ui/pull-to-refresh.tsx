"use client";

import { useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TRIGGER = 64;

export function PullToRefresh() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const startY = useRef<number | null>(null);
  const pull = useRef(0);
  const refreshing = useRef(false);
  const [label, setLabel] = useState<"idle" | "pull" | "release" | "refreshing">("idle");

  useEffect(() => {
    function onStart(event: TouchEvent) {
      if (window.scrollY > 0 || refreshing.current) return;
      startY.current = event.touches[0]?.clientY ?? null;
    }

    function onMove(event: TouchEvent) {
      if (startY.current == null) return;
      if (window.scrollY > 0) {
        startY.current = null;
        pull.current = 0;
        setLabel("idle");
        return;
      }
      const y = event.touches[0]?.clientY;
      if (y == null) return;
      const dy = y - startY.current;
      if (dy <= 0) {
        pull.current = 0;
        setLabel("idle");
        return;
      }
      pull.current = Math.min(dy, 96);
      setLabel(pull.current >= TRIGGER ? "release" : "pull");
    }

    function onEnd() {
      if (startY.current == null) return;
      const distance = pull.current;
      startY.current = null;
      pull.current = 0;
      if (distance < TRIGGER) {
        setLabel("idle");
        return;
      }
      refreshing.current = true;
      setLabel("refreshing");
      router.refresh();
      window.setTimeout(() => {
        refreshing.current = false;
        setLabel("idle");
      }, reduce ? 0 : 400);
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [reduce, router]);

  const text =
    label === "refreshing" ? "Refreshing" : label === "release" ? "Release to refresh" : label === "pull" ? "Pull to refresh" : "";

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(66px+env(safe-area-inset-top))] z-30 flex justify-center">
      {text ? <p className="rounded-full bg-surface-1 px-3 py-1 text-[13px] text-ink-muted">{text}</p> : <span className="sr-only">Pull to refresh</span>}
    </div>
  );
}
