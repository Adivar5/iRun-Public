"use client";

import { useState } from "react";

import { markLegDay } from "@/app/(app)/strength/actions";
import { Button } from "@/components/ui/button";

export function LegDayToggle({ workoutId, legDay }: { workoutId: string; legDay: boolean }) {
  const [on, setOn] = useState(legDay);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="secondary"
        aria-pressed={on}
        onClick={async () => {
          const next = !on;
          const result = await markLegDay(workoutId, next);
          if (!result.ok) {
            setMessage(result.message);
            return;
          }
          setOn(next);
          setMessage(null);
        }}
      >
        {on ? "Marked as leg day" : "Mark as leg day"}
      </Button>
      {message ? <p className="text-base text-alert">{message}</p> : null}
    </div>
  );
}
