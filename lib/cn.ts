import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The type scale in app/globals.css (text-hero ... text-micro) is custom, so tailwind-merge would
// read text-label as a colour and let a later text-ink-muted delete it. Teach it they are sizes.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["hero", "screen", "stat", "title", "body", "label", "micro"] }],
    },
  },
});

export function cn(...c: (string | false | null | undefined)[]): string {
  return twMerge(clsx(c));
}
