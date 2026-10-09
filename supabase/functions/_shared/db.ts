import postgres from "npm:postgres@3";
import { createClient } from "npm:@supabase/supabase-js@2";

// ponytail: Deno refuses the docker hostname supabase_db_irun (underscore). The network alias `db` is the same container.
function dbUrl(): string {
  const raw = Deno.env.get("SUPABASE_DB_URL")!;
  return raw.includes("@supabase_db_irun") ? raw.replace("@supabase_db_irun", "@db") : raw;
}

export const sql = postgres(dbUrl(), { max: 3, prepare: false });
export const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
