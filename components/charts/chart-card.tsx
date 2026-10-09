"use client";

import type { ReactNode } from "react";

import { SourceFootnote } from "@/components/ui/source-footnote";
import { press } from "@/components/ui/press";

import { ChartTableSheet } from "./chart-table-sheet";

export function ChartCard({
  question,
  answer,
  table,
  source,
  children,
}: {
  question: string;
  answer: string;
  table: { title: string; columns: string[]; rows: (string | number)[][] };
  source?: { at: string; now?: Date };
  children: ReactNode;
}) {
  return (
    <section className={`flex flex-col items-start gap-3 rounded-card border border-line bg-surface-1 p-4 ${press}`}>
      <h2 className="font-body text-base font-semibold text-ink">{question}</h2>
      <div className="w-full min-w-0">{children}</div>
      <p className="text-base text-ink">{answer}</p>
      <ChartTableSheet title={table.title} columns={table.columns} rows={table.rows} />
      {source ? <SourceFootnote source="Strava" at={source.at} now={source.now} /> : null}
    </section>
  );
}
