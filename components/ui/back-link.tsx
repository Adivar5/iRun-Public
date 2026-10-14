import Link from "next/link";
import type { ReactNode } from "react";
import { press } from "./press";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={`inline-flex min-h-11 items-center self-start text-body text-accent-ink ${press}`}>
      {children}
    </Link>
  );
}
