"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InsightCardT } from "@/supabase/functions/_shared/insights/schema";

import { InsightCard } from "./insight-card";

export function InsightStrip({ cards, at }: { cards: InsightCardT[]; at?: string }) {
  const [index, setIndex] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const recordedAt = at ?? new Date(0).toISOString();

  function focusNext() {
    const next = Math.min(index + 1, cards.length - 1);
    setIndex(next);
    const card = refs.current[next];
    card?.focus();
    if (card && typeof card.scrollIntoView === "function") {
      card.scrollIntoView({ inline: "start", block: "nearest" });
    }
  }

  if (cards.length === 0) return null;

  return (
    <section aria-label="This week's insights" className="flex flex-col gap-3">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {cards.map((card, cardIndex) => (
          <div
            key={card.id}
            ref={(node) => {
              refs.current[cardIndex] = node?.querySelector("article") ?? null;
            }}
            className="w-[82%] shrink-0 snap-start"
          >
            <InsightCard card={card} at={recordedAt} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <ol aria-label="Insight position" className="flex items-center gap-1.5">
          {cards.map((card, cardIndex) => (
            <li key={card.id}>
              <span
                aria-current={cardIndex === index ? "true" : undefined}
                className={cardIndex === index ? "block size-1.5 rounded-full bg-accent" : "block size-1.5 rounded-full bg-line"}
              />
            </li>
          ))}
        </ol>
        <Button variant="secondary" disabled={index >= cards.length - 1} onClick={focusNext}>
          Next
        </Button>
      </div>
    </section>
  );
}
