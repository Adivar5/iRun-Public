// built to spec, 21st id 21948 pending
"use client";

import * as Switch from "@radix-ui/react-switch";

export function Toggle({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange(v: boolean): void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 text-base text-ink">
      <span>{label}</span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative inline-flex h-11 w-16 min-h-11 min-w-11 shrink-0 items-center rounded-full border border-line bg-surface-2 px-1 transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none data-[state=checked]:bg-accent-ink"
      >
        <Switch.Thumb className="block size-5 rounded-full bg-ink transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=checked]:translate-x-5 data-[state=checked]:bg-on-accent" />
      </Switch.Root>
    </label>
  );
}
