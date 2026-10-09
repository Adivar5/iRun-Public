"use server";

import { revalidatePath } from "next/cache";

import { assertAal2 } from "@/lib/data/export";
import { supabaseServer } from "@/lib/supabase/server";

export type RefreshState = { message: string | null };

const FAILED = "Refresh did not run.";

function statusOf(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("status" in body)) return null;
  const status = body.status;
  return typeof status === "string" ? status : null;
}

export async function refreshInsights(_prev: RefreshState, _formData: FormData): Promise<RefreshState> {
  const sb = await supabaseServer();
  try {
    await assertAal2(sb);
  } catch {
    return { message: FAILED };
  }
  const { data: sessionData } = await sb.auth.getSession();
  const jwt = sessionData.session?.access_token;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!jwt || !base) return { message: FAILED };
  let response: Response;
  try {
    response = await fetch(`${base}/functions/v1/insights-weekly`, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: "{}",
    });
  } catch {
    return { message: FAILED };
  }
  const status = statusOf(await response.json().catch(() => null));
  if (status === "rate_limited") {
    revalidatePath("/insights");
    revalidatePath("/today");
    return { message: "Three refreshes used today." };
  }
  if (!response.ok) return { message: FAILED };
  revalidatePath("/insights");
  revalidatePath("/today");
  return { message: null };
}
