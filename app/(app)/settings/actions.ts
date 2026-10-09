"use server";

import { revalidatePath } from "next/cache";
import { disconnectStrava } from "@/components/settings/strava-calls";
import { assertAal2, deleteOwnedRows } from "@/lib/data/export";
import { supabaseServer } from "@/lib/supabase/server";
import { ProfileInput, profileFieldErrors } from "./schema";

export async function updateProfile(
  input: unknown,
): Promise<{ ok: true } | { ok: false; fieldErrors: Record<string, string> }> {
  const parsed = ProfileInput.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: profileFieldErrors(parsed.error) };

  const sb = await supabaseServer();
  try {
    await assertAal2(sb);
  } catch {
    return { ok: false, fieldErrors: { form: "Finish the authenticator step, then save again." } };
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, fieldErrors: { form: "Sign in again, then save." } };

  const value = parsed.data;
  const { error } = await sb.from("profiles").upsert({
    user_id: user.id,
    max_hr: value.maxHr,
    resting_hr: value.restingHr,
    goal_5k_pace_s_per_km: value.goal5kPaceSPerKm,
    goal_10k_pace_s_per_km: value.goal10kPaceSPerKm,
    goal_custom_distance_m: value.customDistanceKm == null ? null : Math.round(value.customDistanceKm * 1000),
    goal_custom_pace_s_per_km: value.customPaceSPerKm,
    weekly_km_target_min: value.weeklyKmMin,
    weekly_km_target_max: value.weeklyKmMax,
    zone_bounds: [...value.zoneBounds],
    units: "metric",
  });
  if (error) return { ok: false, fieldErrors: { form: "Those numbers were not saved." } };
  revalidatePath("/settings");
  revalidatePath("/today");
  return { ok: true };
}

export async function deleteAllData(confirm: string): Promise<{ ok: boolean }> {
  if (confirm !== "DELETE") return { ok: false };
  const sb = await supabaseServer();
  try {
    await assertAal2(sb);
  } catch {
    return { ok: false };
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false };
  const { data: sessionData } = await sb.auth.getSession();
  const jwt = sessionData.session?.access_token;
  if (!jwt) return { ok: false };
  try {
    await disconnectStrava(jwt);
    await deleteOwnedRows(sb, user.id);
  } catch {
    return { ok: false };
  }
  await sb.auth.signOut();
  return { ok: true };
}
