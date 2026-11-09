/** Real play stats, saved in this browser. Shown as the hi-score on the title screen. */
export type Stats = { smiles: number; strips: number; bestParty: number };

const KEY = "blush-stats";
const EMPTY: Stats = { smiles: 0, strips: 0, bestParty: 1 };

export function getStats(): Stats {
  if (typeof window === "undefined") return EMPTY;
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return EMPTY;
  }
}

export function recordStrip(shots: number, people: number) {
  const s = getStats();
  const next: Stats = {
    smiles: s.smiles + shots * people,
    strips: s.strips + 1,
    bestParty: Math.max(s.bestParty, people),
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
