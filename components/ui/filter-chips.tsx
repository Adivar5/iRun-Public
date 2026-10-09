// built to spec, 21st id 22213 pending
"use client";

import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/cn";
import { press } from "./press";

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange(v: T): void;
  label: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={label}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            aria-label={option.count == null ? undefined : `${option.label} ${option.count}`}
            className={cn(
              "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-line px-3 text-[13px] font-medium",
              press,
              on ? "border-transparent bg-accent-ink text-on-accent" : "bg-surface-1 text-ink-muted hover:bg-surface-2",
            )}
          >
            <span>{option.label}</span>
            {option.count == null ? null : <span className="num">{option.count}</span>}
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
