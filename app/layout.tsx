import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeInit } from "@/components/ui/theme-init";
import { paper } from "@/components/ui/theme-colors";
import { body, hero } from "./fonts";

export const metadata: Metadata = {
  title: "iRun",
  description: "Your runs, heart rate and progress toward your 5k goal.",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: paper,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${hero.variable}`} suppressHydrationWarning>
      <body>
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}
