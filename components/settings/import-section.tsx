"use client";

import { useId } from "react";

const SKIP_REASON: Record<string, string> = {
  fit_not_supported: "FIT files are not imported. GPX from the same export is.",
  no_gps: "No GPS track in this file.",
  parse_error: "This file could not be read.",
};

export function ImportSection({
  progress,
  skipped,
  onFile,
}: {
  progress: { done: number; total: number } | null;
  skipped: { file: string; reason: string }[];
  onFile(file: File): void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-[13px] text-ink-muted">
          Strava archive
        </label>
        <input
          id={id}
          type="file"
          accept=".zip"
          className="block min-h-11 w-full text-base text-ink file:mr-3 file:inline-flex file:min-h-11 file:items-center file:rounded-btn file:border file:border-line file:bg-surface-2 file:px-4 file:text-base file:text-ink file:transition-[background-color,transform,translate] file:duration-200 file:ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:file:transition-none file:hover:-translate-y-px file:hover:bg-surface-1"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
      </div>
      {progress ? (
        <div className="flex flex-col gap-2">
          <p className="num text-[13px] text-ink-muted">
            {progress.done} of {progress.total}
          </p>
          <div
            role="progressbar"
            aria-label="Archive import"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            className="h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className="h-full bg-accent transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ width: `${Math.min(100, (progress.done / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}
      {skipped.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {skipped.map((item) => (
            <li key={`${item.file}:${item.reason}`} className="flex flex-col gap-1">
              <p className="break-all text-base text-ink">{item.file}</p>
              <p className="text-base text-ink-muted">{SKIP_REASON[item.reason] ?? "This file was skipped."}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
