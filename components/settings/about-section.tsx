import { Section } from "@/components/ui/section";

export function AboutSection() {
  return (
    <Section id="limits" title="Limits">
      <p className="text-body text-ink">
        Strava holds a copy of every activity, and Strava data use is subject to Strava&apos;s terms (accepted risk, section 4.4). Aggregated stats are sent to Anthropic&apos;s Claude API for insights.
      </p>
      <p className="mt-3 text-body text-ink">
        Run maps use tiles from OpenStreetMap, © OpenStreetMap contributors, under the{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Open Database Licence
        </a>
        . Your browser asks their servers for the tiles of the area you ran in, never for the route itself. This is a private app for one person, within OpenStreetMap&apos;s tile usage policy for light personal use.
      </p>
    </Section>
  );
}
