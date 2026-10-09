// built to spec, 21st id 28180 pending
"use client";

import { useId } from "react";
import { Icon } from "./icon";
import { press } from "./press";

export function NumberField({
  value,
  onChange,
  label,
  min,
  max,
  step = 1,
  unit,
}: {
  value: number;
  onChange(v: number): void;
  label: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const id = useId();
  function commit(next: number) {
    if (Number.isNaN(next)) return;
    onChange(Math.min(max, Math.max(min, next)));
  }
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] text-ink-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className={`grid size-11 min-h-11 min-w-11 place-items-center rounded-btn border border-line text-ink hover:bg-surface-2 ${press}`}
          onClick={() => commit(value - step)}
        >
          <Icon name="minus" />
        </button>
        <input
          id={id}
          className="num h-11 w-20 rounded-btn border border-line bg-surface-1 text-center text-base text-ink"
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => commit(event.target.valueAsNumber)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              commit(value + step);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              commit(value - step);
            }
          }}
        />
        {unit ? <span className="text-[13px] text-ink-muted">{unit}</span> : null}
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className={`grid size-11 min-h-11 min-w-11 place-items-center rounded-btn border border-line text-ink hover:bg-surface-2 ${press}`}
          onClick={() => commit(value + step)}
        >
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
}
