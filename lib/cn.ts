import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...c: (string | false | null | undefined)[]): string {
  return twMerge(clsx(c));
}
