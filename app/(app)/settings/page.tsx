import Link from "next/link";
import { redirect } from "next/navigation";
import { AboutSection } from "@/components/settings/about-section";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { ErrorBanner } from "@/components/ui/error-banner";
import { press } from "@/components/ui/press";
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
    <main className="mx-auto flex w-full max-w-[430px] flex-col gap-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-3">
        <Link href="/today" className={`inline-flex min-h-11 items-center self-start text-base text-accent-ink ${press}`}>
          Today
        </Link>
        <h1 className="font-display text-[32px] font-semibold text-ink">Settings</h1>
        <p className="text-base text-ink-muted">Zones, the 5k, and the Strava link that fills Today.</p>
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
    </main>
  );
}
