"use client";

import { useState } from "react";
import { ImportSection } from "./import-section";

type Skipped = { file: string; reason: string };

type ArchiveModule = {
  importArchive: (
    file: File,
    onProgress: (done: number, total: number) => void,
  ) => Promise<{ inserted: number; skipped: number | Skipped[]; jobId: string }>;
};

export function ImportArchive({
  initialProgress,
  initialSkipped,
}: {
  initialProgress: { done: number; total: number } | null;
  initialSkipped: Skipped[];
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [skipped, setSkipped] = useState(initialSkipped);
  const [message, setMessage] = useState<string | null>(null);

  async function onFile(file: File) {
    setMessage(null);
    try {
      const loaded = (await import("@/lib/archive/import")) as ArchiveModule;
      const result = await loaded.importArchive(file, (done, total) => setProgress({ done, total }));
      if (Array.isArray(result.skipped)) {
        setSkipped(result.skipped);
        setMessage(`Imported ${result.inserted}.`);
      } else {
        setSkipped([]);
        setMessage(`Imported ${result.inserted}. Skipped ${result.skipped}.`);
      }
    } catch {
      setMessage("That archive could not be read.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {message ? (
        <p role="status" className="text-base text-ink">
          {message}
        </p>
      ) : null}
      <ImportSection progress={progress} skipped={skipped} onFile={onFile} />
    </div>
  );
}
