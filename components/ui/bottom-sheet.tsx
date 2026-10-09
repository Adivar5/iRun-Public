// built to spec, 21st id 31360 pending
"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Drawer } from "vaul";
import { Icon } from "./icon";
import { press } from "./press";

const SNAPS = [0.5, 0.92] as const;
const SHEET_STYLE_ID = "irun-sheet-motion";
const SHEET_CSS = `
.irun-sheet [data-vaul-handle] {
  background: var(--border) !important;
  opacity: 1 !important;
  height: 4px !important;
  width: 2.5rem !important;
}
@media (prefers-reduced-motion: no-preference) {
  .irun-sheet[data-vaul-drawer] {
    transition-duration: 200ms !important;
    transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1) !important;
    animation-duration: 200ms !important;
    animation-timing-function: cubic-bezier(0.23, 1, 0.32, 1) !important;
  }
  .irun-sheet-overlay[data-vaul-overlay] {
    transition-duration: 200ms !important;
    transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1) !important;
  }
}
`;

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function installSheetMotion() {
  if (document.getElementById(SHEET_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SHEET_STYLE_ID;
  style.textContent = SHEET_CSS;
  document.head.appendChild(style);
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  title: string;
  children: ReactNode;
}) {
  const [snap, setSnap] = useState<number | string | null>(SNAPS[1]);
  const [seenOpen, setSeenOpen] = useState(open);
  if (open !== seenOpen) {
    setSeenOpen(open);
    if (open) setSnap(SNAPS[1]);
  }
  useLayoutEffect(() => {
    installSheetMotion();
  }, []);
  // Vaul's snap-point sheet starts at translateY(100%), which parks Close below the
  // viewport. Place it just under the open snap, then ease it up over 200ms.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let frame = 0;
    const place = () => {
      if (cancelled) return;
      const drawer = document.querySelector<HTMLElement>(".irun-sheet[data-vaul-drawer]");
      if (!drawer) {
        frame = requestAnimationFrame(place);
        return;
      }
      const hidden = window.innerHeight * (1 - SNAPS[1]);
      const target = `translate3d(0, ${hidden}px, 0)`;
      if (prefersReducedMotion()) {
        drawer.style.transform = target;
        return;
      }
      drawer.style.setProperty("transition-duration", "0s", "important");
      drawer.style.transform = `translate3d(0, ${hidden + 48}px, 0)`;
      drawer.getBoundingClientRect();
      drawer.style.removeProperty("transition-duration");
      drawer.style.transform = target;
    };
    place();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [open]);
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      autoFocus={false}
      shouldScaleBackground={false}
      snapPoints={[...SNAPS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="irun-sheet-overlay fixed inset-0 z-50 bg-bg/80" />
        <Drawer.Content
          aria-describedby={undefined}
          className="irun-sheet fixed inset-x-0 bottom-0 z-50 mx-auto flex h-full w-full max-w-[430px] flex-col rounded-t-sheet border border-line bg-surface-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] outline-none"
        >
          <Drawer.Handle aria-hidden className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-line" />
          <div className="flex items-center justify-between gap-3 px-4 pt-3">
            <Drawer.Title className="font-display text-[20px] font-semibold text-ink">{title}</Drawer.Title>
            <Drawer.Close
              aria-label="Close"
              className={`grid size-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-btn text-ink hover:bg-surface-1 ${press}`}
            >
              <Icon name="x" />
            </Drawer.Close>
          </div>
          <div className="overflow-y-auto px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] text-base text-ink">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
