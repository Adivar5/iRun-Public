import { InsightsScreen } from "@/components/insights/insights-screen";
import { getInsights } from "@/lib/data/insights";
import { supabaseServer } from "@/lib/supabase/server";

import { refreshInsights } from "./actions";

export default async function InsightsPage() {
  const { weeks, refreshesLeft } = await getInsights(await supabaseServer());
  return <InsightsScreen weeks={weeks} refreshesLeft={refreshesLeft} refreshAction={refreshInsights} />;
}
