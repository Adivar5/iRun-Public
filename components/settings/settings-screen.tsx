"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { Card } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { exportAll } from "@/lib/data/export";
import {
  deleteStravaApiWorkouts,
  type BackfillJob,
  type SkippedFile,
  type StravaConnection,
  type SyncLogEntry,
} from "@/lib/data/settings";
import type { ProfileValues } from "@/app/(app)/settings/schema";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ImportArchive } from "./import-archive";
import { ProfileForm } from "./profile-form";
import { SecuritySection } from "./security-section";
import { connectStrava, disconnectStrava, resyncRecent, sessionJwt } from "./strava-calls";
import { StravaSection } from "./strava-section";

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SettingsScreen({
  userId,
  profile,
  profileSaved,
  connection,
  logs,
  backfill,
  archiveProgress,
  archiveSkipped,
  totpEnrolled,
  saveProfile,
  deleteAll,
}: {
  userId: string;
  profile: ProfileValues;
  profileSaved: boolean;
  connection: StravaConnection | null;
  logs: SyncLogEntry[];
  backfill: BackfillJob | null;
  archiveProgress: { done: number; total: number } | null;
  archiveSkipped: SkippedFile[];
  totpEnrolled: boolean;
  saveProfile(input: unknown): Promise<{ ok: true } | { ok: false; fieldErrors: Record<string, string> }>;
  deleteAll(confirm: string): Promise<{ ok: boolean }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function withJwt(work: (jwt: string) => Promise<void>) {
    const jwt = await sessionJwt(supabaseBrowser());
    await work(jwt);
  }

  return (
    <div className="flex flex-col gap-8">
      {message ? <ErrorBanner message={message} /> : null}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink">Heart rate and the 5k</h2>
        <p className="text-base text-ink-muted">Max heart rate sets the zones. The 5k pace is the number Today chases.</p>
        <ProfileForm initial={profile} saved={profileSaved} save={saveProfile} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink">Strava</h2>
        <p className="text-base text-ink-muted">Connect once. New runs land on Today after the next sync.</p>
        <StravaSection
          connection={connection}
          logs={logs}
          backfill={backfill}
          onConnect={async () => {
            await withJwt(async (jwt) => {
              const url = await connectStrava(jwt);
              window.location.href = url;
            });
          }}
          onResync={async () => {
            await withJwt((jwt) => resyncRecent(jwt));
          }}
          onKeep={async () => {
            await withJwt((jwt) => disconnectStrava(jwt));
          }}
          onDeleteApi={async () => {
            await withJwt((jwt) => disconnectStrava(jwt));
            await deleteStravaApiWorkouts(supabaseBrowser(), userId);
          }}
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink">Archive</h2>
        <p className="text-base text-ink-muted">A Strava export zip stays on this phone. FIT files are listed and skipped.</p>
        <Card>
          <ImportArchive initialProgress={archiveProgress} initialSkipped={archiveSkipped} />
        </Card>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink">Security</h2>
        <SecuritySection
          totpEnrolled={totpEnrolled}
          busy={pending}
          onSignOutOthers={() => {
            setMessage(null);
            startTransition(async () => {
              const { error } = await supabaseBrowser().auth.signOut({ scope: "others" });
              setMessage(error ? "Other sessions were not signed out." : null);
            });
          }}
          onExport={() => {
            setMessage(null);
            startTransition(async () => {
              try {
                const { json, csv } = await exportAll(supabaseBrowser());
                download("irun-export.json", new Blob([json], { type: "application/json" }));
                const zip = new JSZip();
                for (const [table, text] of Object.entries(csv)) zip.file(`${table}.csv`, text);
                download("irun-export.zip", await zip.generateAsync({ type: "blob" }));
              } catch (error) {
                setMessage(
                  error instanceof Error && error.message === "aal2_required"
                    ? "Export needs the authenticator step."
                    : "Export did not finish.",
                );
              }
            });
          }}
          onDelete={(confirm) => {
            setMessage(null);
            startTransition(async () => {
              const result = await deleteAll(confirm);
              if (!result.ok) {
                setMessage("Delete did not run. The authenticator step has to be current, and the field has to read DELETE.");
                return;
              }
              router.push("/login");
            });
          }}
        />
      </section>
    </div>
  );
}
