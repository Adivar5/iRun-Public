"use client";

import { useState } from "react";

import { renameLoop } from "@/app/(app)/runs/loops/actions";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

export function RenameLoop({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Rename
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Rename loop">
        <form
          className="flex flex-col gap-3"
          action={async (formData) => {
            const result = await renameLoop(id, String(formData.get("name") ?? ""));
            if (!result.ok) {
              setError(result.message);
              return;
            }
            setError(null);
            setOpen(false);
          }}
        >
          <label className="flex flex-col gap-1 text-base text-ink" htmlFor="loop-name">
            Name
            <input
              id="loop-name"
              name="name"
              defaultValue={name}
              autoFocus
              enterKeyHint="done"
              maxLength={80}
              required
              className="min-h-11 rounded-card border border-line bg-surface-1 px-3 text-base text-ink"
            />
          </label>
          {error ? <p className="text-base text-alert">{error}</p> : null}
          <Button type="submit">Save</Button>
        </form>
      </BottomSheet>
    </>
  );
}
