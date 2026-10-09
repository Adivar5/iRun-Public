"use client";

import { useRouter } from "next/navigation";

import { SegmentedControl } from "@/components/ui/segmented-control";

export function RunMode({ mode }: { mode: "runs" | "loops" }) {
  const router = useRouter();
  return (
    <SegmentedControl
      label="Runs or loops"
      options={[
        { value: "runs", label: "All runs" },
        { value: "loops", label: "Loops" },
      ]}
      value={mode}
      onChange={(next) => {
        router.push(next === "loops" ? "/runs/loops" : "/runs");
      }}
    />
  );
}
