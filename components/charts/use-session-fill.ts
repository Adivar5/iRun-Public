"use client";

import { useEffect, useState } from "react";

const seenFills = new Set<string>();

export function useSessionFill(key: string, active: boolean): boolean {
  const [play, setPlay] = useState(() => active && !seenFills.has(key));

  if (active && !play && !seenFills.has(key)) {
    setPlay(true);
  }

  useEffect(() => {
    if (!play) return;
    const frame = requestAnimationFrame(() => {
      seenFills.add(key);
    });
    return () => cancelAnimationFrame(frame);
  }, [play, key]);

  return play;
}
