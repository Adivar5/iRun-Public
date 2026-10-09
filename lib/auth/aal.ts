type L = "aal1" | "aal2" | null;

export function routeForAal(a: { currentLevel: L; nextLevel: L }) {
  if (!a.currentLevel) return "/login" as const;
  if (a.currentLevel === "aal2") return null;
  return a.nextLevel === "aal2" ? ("/mfa" as const) : ("/mfa/enroll" as const);
}
