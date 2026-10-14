import { Icon } from "./icon";

export function PbChip({ children = "New 5k PB" }: { children?: string }) {
  return (
    <span className="inline-flex items-center gap-1 self-start rounded-full bg-accent-2 px-3 py-1 text-label font-semibold text-on-accent-2 shadow-[0_0_var(--glow-size)_var(--glow-peach)]">
      <Icon name="medal" className="size-4" />
      {children}
    </span>
  );
}
