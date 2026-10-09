"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";

const field =
  "h-11 w-full rounded-btn border border-line bg-surface-1 px-3 text-base text-ink tracking-[0.3em] outline-solid outline-2 outline-offset-2 outline-transparent transition-[outline-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";

const WRONG = "That code didn't work. Codes change every 30 seconds, try the newest one.";

type Enrollment = { id: string; qr: string; secret: string };

let enrollmentTask: Promise<Enrollment | "login" | "mfa"> | null = null;

function loadEnrollment(): Promise<Enrollment | "login" | "mfa"> {
  if (enrollmentTask) return enrollmentTask;
  enrollmentTask = (async () => {
    const sb = supabaseBrowser();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      enrollmentTask = null;
      return "login";
    }
    const { data: factors, error: listError } = await sb.auth.mfa.listFactors();
    if (listError) {
      enrollmentTask = null;
      throw new Error("enroll failed");
    }
    if (factors?.totp.some((factor) => factor.status === "verified")) {
      enrollmentTask = null;
      return "mfa";
    }
    for (const factor of factors?.all ?? []) {
      if (factor.factor_type === "totp" && factor.status !== "verified") {
        const { error: unenrollError } = await sb.auth.mfa.unenroll({ factorId: factor.id });
        if (unenrollError) {
          enrollmentTask = null;
          throw new Error("enroll failed");
        }
      }
    }
    const { data, error: enrollError } = await sb.auth.mfa.enroll({ factorType: "totp" });
    if (enrollError || !data?.totp) {
      enrollmentTask = null;
      throw new Error("enroll failed");
    }
    return { id: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  })();
  return enrollmentTask;
}

function qrSrc(qr: string) {
  if (qr.startsWith("data:")) return qr;
  return `data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`;
}

export default function EnrollPage() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadEnrollment()
      .then((result) => {
        if (cancelled) return;
        if (result === "login") {
          router.replace("/login");
          return;
        }
        if (result === "mfa") {
          router.replace("/mfa");
          return;
        }
        setError("");
        setEnrollment(result);
      })
      .catch(() => {
        if (cancelled) return;
        setEnrollment(null);
        setError("Could not start authenticator setup. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, router]);

  function retry() {
    setError("");
    setAttempt((n) => n + 1);
  }

  async function verify(formData: FormData) {
    if (!enrollment) return;
    const code = String(formData.get("code") ?? "").trim();
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError(WRONG);
      return;
    }
    setPending(true);
    const sb = supabaseBrowser();
    const { error: verifyError } = await sb.auth.mfa.challengeAndVerify({
      factorId: enrollment.id,
      code,
    });
    setPending(false);
    if (verifyError) {
      setError(WRONG);
      return;
    }
    enrollmentTask = null;
    router.replace("/today");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-4 py-10">
      <h1 className="font-display text-[32px] font-semibold text-ink">Add your authenticator</h1>
      <p className="mt-2 text-base text-ink-muted">
        Scan the code, or type the key into your app, then enter the 6-digit code it shows.
      </p>
      {error ? (
        <p role="alert" className="mt-6 text-base text-alert">
          {error}
        </p>
      ) : null}
      {enrollment ? (
        <form action={verify} className="mt-8 flex flex-col gap-4">
          {/* QR is an SVG data URL from Auth. next/image cannot load it without config changes. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc(enrollment.qr)}
            alt="Authenticator QR code"
            width={180}
            height={180}
            className="h-[180px] w-[180px] rounded-card bg-white p-2"
          />
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-ink-muted">Manual entry key</span>
            <p className="num break-all text-base text-ink">{enrollment.secret}</p>
          </div>
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
          <Button type="submit" loading={pending} className="w-full">
            Verify and continue
          </Button>
        </form>
      ) : error ? (
        <Button type="button" className="mt-4 w-full" onClick={retry}>
          Try again
        </Button>
      ) : (
        <p className="mt-8 text-base text-ink-muted">Preparing your authenticator code.</p>
      )}
    </main>
  );
}
