// built to spec, 21st id 24297 pending
"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "./icon";
import { press } from "./press";
import { STATUS_ICON, type Status } from "./status-chip";

const EASE = [0.23, 1, 0.32, 1] as const;

type ToastItem = { id: number; message: string; status?: Status };

let seq = 0;
let toasts: readonly ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function toast(message: string, opts?: { status?: Status }): void {
  seq += 1;
  toasts = [...toasts, { id: seq, message, status: opts?.status }];
  emit();
}

function dismiss(id: number) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot() {
  return toasts;
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, snapshot, snapshot);
  const reduce = useReducedMotion();
  useEffect(() => {
    return () => {
      toasts = [];
    };
  }, []);
  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto flex w-full max-w-[430px] flex-col gap-2 px-4">
      <AnimatePresence>
        {items.map((item) => {
          const icon = item.status ? STATUS_ICON[item.status] : null;
          return (
            <motion.div
              key={item.id}
              role="status"
              data-status={item.status}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE }}
              className="flex items-center gap-2 rounded-card border border-line bg-surface-2 px-3 py-2 text-base text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
            >
              {icon ? <Icon name={icon} /> : null}
              <p className="min-w-0 flex-1">{item.message}</p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(item.id)}
                className={`grid size-11 min-h-11 min-w-11 place-items-center rounded-btn text-ink-muted hover:bg-surface-1 ${press}`}
              >
                <Icon name="x" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
