"use server";

import { revalidatePath } from "next/cache";

import { assertAal2 } from "@/lib/data/export";
import { supabaseServer } from "@/lib/supabase/server";

export async function renameLoop(id: string, name: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) return { ok: false, message: "Use a name up to 80 characters." };
  const sb = await supabaseServer();
  try {
    await assertAal2(sb);
  } catch {
    return { ok: false, message: "Finish the authenticator step, then save again." };
  }
  const { error } = await sb.from("loops").update({ name: trimmed }).eq("id", id);
  if (error) return { ok: false, message: "That name was not saved." };
  revalidatePath("/runs/loops");
  revalidatePath(`/runs/loops/${id}`);
  return { ok: true };
}
