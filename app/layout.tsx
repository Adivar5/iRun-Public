import type { Metadata, Viewport } from "next";
import "./globals.css";
import { display, body, mono } from "./fonts";

export const metadata: Metadata = {
  title: "iRun",
  description: "Your runs, heart rate and progress toward your 5k goal.",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10140C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
