// built to spec, 21st id 34763 pending
"use client";

import { useId } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { press } from "./press";

const EASE = [0.23, 1, 0.32, 1] as const;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange(v: T): void;
  label: string;
}) {
  const reduce = useReducedMotion();
  const thumb = useId();
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={label}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className="flex gap-1 rounded-full border border-line bg-surface-1 p-1"
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            className={cn(
              "relative min-h-11 min-w-11 flex-1 rounded-full px-3 text-[13px] font-medium text-ink-muted hover:bg-surface-2",
              press,
              on && "text-on-accent",
            )}
          >
            {on ? (
              <motion.span
                layoutId={thumb}
                aria-hidden
                transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE }}
                className="absolute inset-0 rounded-full bg-accent-ink"
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
