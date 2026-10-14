import { Anybody, Geist } from "next/font/google";

// Geist carries every sentence, label, and number. Anybody italic is only the big distance number on Today.
export const body = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-face",
  display: "swap",
});

export const hero = Anybody({
  subsets: ["latin"],
  weight: ["700"],
  style: ["italic"],
  variable: "--font-hero-face",
  display: "swap",
});
