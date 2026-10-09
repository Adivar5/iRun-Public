import { signIn } from "./actions";
import { Button } from "@/components/ui/button";

const field =
  "h-11 w-full rounded-btn border border-line bg-surface-1 px-3 text-base text-ink outline-solid outline-2 outline-offset-2 outline-transparent transition-[outline-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-4 py-10">
      {/* Static wordmark in /public. next/image does not add anything for this SVG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/irun-white.svg" alt="iRun" className="h-4 w-auto self-start" />
      <h1 className="mt-6 font-display text-[32px] font-semibold text-ink">Sign in</h1>
      <p className="mt-2 text-base text-ink-muted">Your runs stay on this one account.</p>
      <form action={signIn} className="mt-8 flex flex-col gap-4">
        {error ? (
          <p role="alert" className="text-base text-alert">
            Email or password is wrong. Check both and try again.
          </p>
        ) : null}
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-[13px] text-ink-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-[13px] text-ink-muted">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={field}
          />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </main>
  );
}
