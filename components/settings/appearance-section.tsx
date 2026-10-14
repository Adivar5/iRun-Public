"use client";

import { useSyncExternalStore } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Section } from "@/components/ui/section";

type Mode = "light" | "dark";

const subscribe = (notify: () => void) => {
  window.addEventListener("irun-theme", notify);
  return () => window.removeEventListener("irun-theme", notify);
};
const read = (): Mode => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function apply(next: Mode) {
  if (next === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#081412" : "#F3F0E4");
  try {
    localStorage.setItem("irun-theme", next);
  } catch {
    // Private mode or blocked storage: the choice still applies for this visit.
  }
  window.dispatchEvent(new Event("irun-theme"));
}

export function AppearanceSection() {
  const mode = useSyncExternalStore(subscribe, read, () => "light" as Mode);
  return (
    <Section id="appearance" title="Appearance">
      <p className="text-body text-ink-muted">The app opens in light. Dark is saved on this phone only.</p>
      <SegmentedControl
        label="Theme"
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        value={mode}
        onChange={apply}
      />
    </Section>
  );
}
