"use server";

import { revalidatePath } from "next/cache";

import { assertAal2 } from "@/lib/data/export";
import { supabaseServer } from "@/lib/supabase/server";

export async function markLegDay(
  workoutId: string,
  legDay: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sb = await supabaseServer();
  try {
    await assertAal2(sb);
  } catch {
    return { ok: false, message: "Finish the authenticator step, then save again." };
  }
  const { error } = await sb
    .from("workouts")
    .update({ is_leg_day: legDay, leg_day_source: "user" })
    .eq("id", workoutId)
    .eq("type", "strength");
  if (error) return { ok: false, message: "That mark was not saved." };
  revalidatePath("/strength");
  revalidatePath(`/strength/${workoutId}`);
  revalidatePath("/today");
  return { ok: true };
}
