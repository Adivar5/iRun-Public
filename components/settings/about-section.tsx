export function AboutSection() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-[20px] font-semibold text-ink">Limits</h2>
      <p className="text-base text-ink">
        Strava holds a copy of every activity, and Strava data use is subject to Strava&apos;s terms (accepted risk, section 4.4). Aggregated stats are sent to Anthropic&apos;s Claude API for insights.
      </p>
    </section>
  );
}
