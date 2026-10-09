import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabaseServer } from "@/lib/supabase/server";

const field =
  "h-11 w-full rounded-btn border border-line bg-surface-1 px-3 text-base text-ink tracking-[0.3em] outline-solid outline-2 outline-offset-2 outline-transparent transition-[outline-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";

const WRONG = "That code didn't work. Codes change every 30 seconds, try the newest one.";

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((item) => item.status === "verified");
  if (!factor) redirect("/mfa/enroll");

  async function verify(formData: FormData) {
    "use server";
    const code = String(formData.get("code") ?? "").trim();
    const factorId = String(formData.get("factorId") ?? "");
    if (!/^\d{6}$/.test(code) || !factorId) redirect("/mfa?error=1");
    const sb = await supabaseServer();
    const { error: verifyError } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) redirect("/mfa?error=1");
    redirect("/today");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-4 py-10">
      <h1 className="font-display text-[32px] font-semibold text-ink">Authenticator code</h1>
      <p className="mt-2 text-base text-ink-muted">
        Open your authenticator app and enter the current 6-digit code.
      </p>
      <form action={verify} className="mt-8 flex flex-col gap-4">
        {error ? (
          <p role="alert" className="text-base text-alert">
            {WRONG}
          </p>
        ) : null}
        <div className="flex flex-col gap-1">
          <label htmlFor="code" className="text-[13px] text-ink-muted">
            6-digit code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            className={field}
          />
        </div>
        <input type="hidden" name="factorId" value={factor.id} />
        <Button type="submit" className="w-full">
          Verify
        </Button>
      </form>
    </main>
  );
}
