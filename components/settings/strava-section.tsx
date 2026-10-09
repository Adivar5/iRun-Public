"use client";

import { useEffect, useState } from "react";
import type { Status } from "@/components/ui/status-chip";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { backfillCopy, loadBackfill, type BackfillJob, type StravaConnection, type SyncLogEntry, type SyncStatus } from "@/lib/data/settings";
import { supabaseBrowser } from "@/lib/supabase/client";
import { showKeepOrDelete } from "@/lib/data/settings";

const TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jerusalem",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function reasonText(error: string | null): string {
  switch (error) {
    case "rate_limited":
      return "Strava asked us to wait. The next sync will retry.";
    case "token_invalid":
      return "Strava rejected the saved login. Connect again.";
    case "fetch_failed":
      return "That activity could not be downloaded.";
    default:
      return "The sync failed.";
  }
}

function presentation(status: SyncStatus, error: string | null): { word: string; tone: Status; detail: string } {
  switch (status) {
    case "ok":
      return { word: "Synced", tone: "good", detail: "Sync finished." };
    case "error":
      return { word: "Failed", tone: "alert", detail: reasonText(error) };
    case "skipped":
      return { word: "Skipped", tone: "watch", detail: "This event was skipped." };
    default: {
      const neverStatus: never = status;
      return neverStatus;
    }
  }
}

export type StravaSectionProps = {
  connection: StravaConnection | null;
  logs: SyncLogEntry[];
  backfill: BackfillJob | null;
  onConnect(): Promise<void> | void;
  onResync(): Promise<void> | void;
  onKeep(): Promise<void> | void;
  onDeleteApi(): Promise<void> | void;
};

export function StravaSection({
  connection,
  logs,
  backfill,
  onConnect,
  onResync,
  onKeep,
  onDeleteApi,
}: StravaSectionProps) {
  const latest = logs[0] ?? null;
  const deauthorized = showKeepOrDelete(connection, latest);
  const [open, setOpen] = useState(deauthorized);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<"connect" | "resync" | "choice" | null>(null);
  const [job, setJob] = useState(backfill);
  const [starting, setStarting] = useState(false);
  const linked = connection != null && connection.revokedAt == null;
  const watch = starting || job?.status === "running" || (job?.waiting ?? 0) > 0;

  useEffect(() => {
    if (!watch) return;
    let cancel = false;
    async function pull() {
      try {
        const next = await loadBackfill(supabaseBrowser());
        if (!cancel) {
          setJob(next);
          setStarting(false);
        }
      } catch {
        // Keep the last line. The next tick tries again.
      }
    }
    void pull();
    const timer = window.setInterval(() => void pull(), 3000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [watch]);

  async function run(kind: "connect" | "resync" | "choice", work: () => Promise<void> | void, failure: string) {
    setBusy(kind);
    setNote(null);
    try {
      await work();
    } catch {
      setNote(failure);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <p className="text-base text-ink">
          {!connection ? "No Strava connection yet." : deauthorized ? "Strava deauthorized this app." : "Strava is connected."}
        </p>
        {connection ? (
          <p className="text-base text-ink">
            {connection.revokedAt
              ? "Webhook paused"
              : connection.webhookSubscriptionId != null
                ? "Webhook listening"
                : "Webhook not registered"}
          </p>
        ) : null}
        {connection && connection.revokedAt == null && connection.webhookSubscriptionId == null ? (
          <p className="text-base text-ink-muted">
            Strava cannot call this computer, so a new run does not arrive on its own. Re-sync still downloads the last 7 days.
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          {linked ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                setNote(null);
                setOpen(true);
              }}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              loading={busy === "connect"}
              onClick={() => run("connect", onConnect, "Strava did not open. Try again.")}
            >
              Connect Strava
            </Button>
          )}
          <Button
            variant="secondary"
            className="w-full"
            disabled={!linked}
            loading={busy === "resync"}
            onClick={() =>
              run("resync", async () => {
                await onResync();
                setStarting(true);
                setNote("Re-sync started for the last 7 days.");
              }, "Re-sync did not start.")
            }
          >
            Re-sync now
          </Button>
        </div>
        {starting && (job?.waiting ?? 0) === 0 ? (
          <p className="text-base text-ink">Checking the last 7 days.</p>
        ) : job ? (
          <BackfillLine job={job} />
        ) : null}
        {note ? (
          <p role="status" className="text-base text-ink">
            {note}
          </p>
        ) : null}
        {logs.length === 0 ? (
          <p className="text-base text-ink-muted">No syncs yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {logs.slice(0, 20).map((entry) => {
              const view = presentation(entry.status, entry.error);
              const detail =
                deauthorized && entry.id === latest?.id ? "Strava deauthorized this app." : view.detail;
              return (
                <li key={entry.id} className="flex flex-col gap-1 border-b border-line pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <StatusChip status={view.tone} label={view.word} />
                    <time dateTime={entry.receivedAt} className="num text-[13px] text-ink-muted">
                      {TIME.format(new Date(entry.receivedAt))}
                    </time>
                  </div>
                  <p className="text-base text-ink">{detail}</p>
                  {entry.count > 0 ? (
                    <p className="text-[13px] text-ink-muted">
                      {entry.count === 1 ? "1 activity" : `${entry.count} activities`}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <BottomSheet open={open} onOpenChange={setOpen} title="Strava data">
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-base text-ink">
            Disconnect stops syncing. Archive imports stay. Keeping API runs is a risk you accept.
          </p>
          {note ? (
            <p role="alert" className="text-base text-alert">
              {note}
            </p>
          ) : null}
          <Button
            variant="secondary"
            className="w-full"
            loading={busy === "choice"}
            onClick={() =>
              run("choice", async () => {
                await onKeep();
                setOpen(false);
              }, "Strava did not disconnect.")
            }
          >
            Keep my Strava data
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            loading={busy === "choice"}
            onClick={() =>
              run("choice", async () => {
                await onDeleteApi();
                setOpen(false);
              }, "Strava runs were not deleted.")
            }
          >
            Delete my Strava data
          </Button>
        </div>
      </BottomSheet>
    </Card>
  );
}

function BackfillLine({ job }: { job: BackfillJob }) {
  const view = backfillCopy(job);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base text-ink">{view.label}</p>
      {view.showBar ? (
        <div
          role="progressbar"
          aria-label="Backfill"
          aria-valuemin={0}
          aria-valuemax={Math.max(view.total, 1)}
          aria-valuenow={view.done}
          className="h-2 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full bg-accent transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ width: `${view.total === 0 ? 0 : Math.min(100, (view.done / view.total) * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
