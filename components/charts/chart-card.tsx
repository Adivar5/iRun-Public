"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { SourceFootnote } from "@/components/ui/source-footnote";

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
    <Card as="section" className="flex flex-col items-start gap-3">
      <h2 className="font-body text-body font-semibold text-ink">{question}</h2>
      <div className="w-full min-w-0">{children}</div>
      <p className="mt-1 text-body text-ink">{answer}</p>
      <ChartTableSheet title={table.title} columns={table.columns} rows={table.rows} />
      {source ? <SourceFootnote source="Strava" at={source.at} now={source.now} /> : null}
    </Card>
  );
}
