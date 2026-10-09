"use client";

import { useState, type ReactNode } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";

export function formatChartPace(sPerKm: number | null): string {
  if (sPerKm == null || !Number.isFinite(sPerKm)) return "No pace";
  const total = Math.round(sPerKm);
  const minutes = Math.floor(total / 60);
  const rest = Math.abs(total % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function formatChartHeart(bpm: number | null): string {
  if (bpm == null || !Number.isFinite(bpm)) return "No heart rate";
  return String(Math.round(bpm));
}

export const chartEaseStyle = `
.irun-ease { transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), left 200ms cubic-bezier(0.23, 1, 0.32, 1); }
@media (prefers-reduced-motion: reduce) {
  .irun-ease { transition: none; }
}
`;

export const chartButtonClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-btn border border-line bg-surface-2 px-4 font-body text-base text-ink motion-safe:transition-[background-color,translate,transform] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-px hover:bg-line active:translate-y-0";

export function ChartTableSheet({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={chartButtonClass} onClick={() => setOpen(true)}>
        View as table
      </button>
      <BottomSheet open={open} onOpenChange={setOpen} title={title}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-base">
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={`${column}-${index}`} scope="col" className="py-2 pr-3 font-medium text-ink">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-line">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="num py-2 pr-3 text-ink">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BottomSheet>
    </>
  );
}

export function ChartEmpty({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p role="img" aria-label={message} className="text-base text-ink">
        {message}
      </p>
      {children}
    </div>
  );
}
