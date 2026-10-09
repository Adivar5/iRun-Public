"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const field =
  "h-11 w-full rounded-btn border border-line bg-surface-1 px-3 text-base text-ink";

export function SecuritySection({
  totpEnrolled,
  onSignOutOthers,
  onExport,
  onDelete,
  busy = false,
}: {
  totpEnrolled: boolean;
  onSignOutOthers(): void;
  onExport(): void;
  onDelete(confirm: string): void;
  busy?: boolean;
}) {
  const [confirm, setConfirm] = useState("");
  const armed = confirm === "DELETE";
  return (
    <Card>
      <div className="flex flex-col gap-5">
        <p className="text-base text-ink">{totpEnrolled ? "Authenticator enrolled" : "Authenticator not enrolled"}</p>
        <div className="flex flex-col gap-3">
          <Button variant="secondary" className="w-full" onClick={onSignOutOthers} disabled={busy}>
            Sign out other sessions
          </Button>
          <p className="text-[13px] text-ink-muted">This phone stays signed in.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button variant="secondary" className="w-full" onClick={onExport} disabled={busy}>
            Export all my data
          </Button>
          <p className="text-[13px] text-ink-muted">A JSON file and a zip of CSV tables. Only your rows.</p>
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <p className="text-base text-ink">
            Delete removes your runs, sync history, insights, and profile numbers in iRun. Your login stays, so you
            can connect Strava again. Strava may still keep its own copy.
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor="delete-confirm" className="text-[13px] text-ink-muted">
              Type DELETE to confirm
            </label>
            <input
              id="delete-confirm"
              value={confirm}
              autoComplete="off"
              spellCheck={false}
              className={field}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          <Button
            variant="destructive"
            className="w-full"
            disabled={!armed || busy}
            onClick={() => onDelete(confirm)}
          >
            Delete all my data
          </Button>
        </div>
      </div>
    </Card>
  );
}
