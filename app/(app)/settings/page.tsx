import { redirect } from "next/navigation";
import { AboutSection } from "@/components/settings/about-section";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { BackLink } from "@/components/ui/back-link";
import { ErrorBanner } from "@/components/ui/error-banner";
import { routeForAal } from "@/lib/auth/aal";
import { loadSettings, noticeCode, stravaNotice } from "@/lib/data/settings";
import { supabaseServer } from "@/lib/supabase/server";
import { deleteAllData, updateProfile } from "./actions";

export const metadata = { title: "Settings · iRun" };

function knownAal(value: string | null | undefined): "aal1" | "aal2" | null {
  if (value === "aal1" || value === "aal2") return value;
  return null;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string }>;
}) {
  const params = await searchParams;
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  const target = routeForAal({
    currentLevel: knownAal(aal?.currentLevel) ?? "aal1",
    nextLevel: knownAal(aal?.nextLevel),
  });
  if (target) redirect(target);

  const [loaded, factors] = await Promise.all([loadSettings(sb), sb.auth.mfa.listFactors()]);
  const notice = stravaNotice(noticeCode(params.strava));
  const totpEnrolled = Boolean(factors.data?.totp.some((factor) => factor.status === "verified"));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <BackLink href="/today">Today</BackLink>
        <h1 className="font-display text-screen font-semibold text-ink">Settings</h1>
        <p className="text-body text-ink-muted">Zones, the 5k, and the Strava link that fills Today.</p>
      </header>
      {notice ? (
        <p role="status" className="text-base text-ink">
          {notice}
        </p>
      ) : null}
      {loaded.ok ? (
        <SettingsScreen
          userId={user.id}
          profile={loaded.profile}
          profileSaved={loaded.profileSaved}
          connection={loaded.connection}
          logs={loaded.logs}
          backfill={loaded.backfill}
          archiveProgress={loaded.archiveProgress}
          archiveSkipped={loaded.archiveSkipped}
          totpEnrolled={totpEnrolled}
          saveProfile={updateProfile}
          deleteAll={deleteAllData}
        />
      ) : (
        <ErrorBanner message="Settings could not be loaded." />
      )}
      <AboutSection />
    </div>
  );
}
