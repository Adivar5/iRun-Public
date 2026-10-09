import { Anybody, IBM_Plex_Mono, Sora } from "next/font/google";

// Big Shoulders Display is not in this Next.js font list. Anybody is: condensed-capable,
// italic, and not the Exo 2 / DM Sans pair the shell was using.
export const display = Anybody({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display-face",
  display: "swap",
});

export const body = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body-face",
  display: "swap",
});

export const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-face",
  display: "swap",
});
