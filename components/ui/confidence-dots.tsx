// built to spec
export function ConfidenceDots({ level }: { level: "low" | "medium" | "high" }) {
  const filled = level === "low" ? 1 : level === "medium" ? 2 : 3;
  const word = level === "low" ? "Low" : level === "medium" ? "Medium" : "High";
  return (
    <p className="inline-flex items-center gap-2 text-[12px] text-ink-muted">
      <span aria-hidden className="inline-flex items-center gap-1">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className={dot < filled ? "size-1.5 rounded-full bg-accent" : "size-1.5 rounded-full bg-line"} />
        ))}
      </span>
      {word} confidence
    </p>
  );
}
