import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/field";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-shell flex-col justify-center px-4 py-10">
      {/* Static wordmark in /public. next/image does not add anything for this SVG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/irun-black.svg" alt="iRun" className="h-4 w-auto self-start [[data-theme=dark]_&]:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/irun-white.svg" alt="" aria-hidden className="hidden h-4 w-auto self-start [[data-theme=dark]_&]:block" />
      <h1 className="mt-6 font-display text-screen font-semibold text-ink">Sign in</h1>
      <p className="mt-2 text-base text-ink-muted">Your runs stay on this one account.</p>
      <form action={signIn} className="mt-8 flex flex-col gap-4">
        {error ? (
          <p role="alert" className="text-base text-alert">
            Email or password is wrong. Check both and try again.
          </p>
        ) : null}
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={fieldClass}
          />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </main>
  );
}
