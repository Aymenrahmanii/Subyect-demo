export interface EvalCase {
  brief: string;
  acceptable: string[];
}

/** True when at least one acceptable ad appears in the top k returned ids. */
export function isHit(returnedIds: string[], acceptable: string[], k = 5): boolean {
  const wanted = new Set(acceptable);
  return returnedIds.slice(0, k).some((id) => wanted.has(id));
}

/** 1-based rank of the first acceptable ad, or null if none was returned. */
export function firstHitRank(returnedIds: string[], acceptable: string[]): number | null {
  const wanted = new Set(acceptable);
  const index = returnedIds.findIndex((id) => wanted.has(id));
  return index === -1 ? null : index + 1;
}

/** Mean reciprocal rank: 1 when the first result is always acceptable, lower as it slips. */
export function meanReciprocalRank(perBrief: { returnedIds: string[]; acceptable: string[] }[]): number {
  if (perBrief.length === 0) return 0;
  const sum = perBrief.reduce((acc, b) => {
    const rank = firstHitRank(b.returnedIds, b.acceptable);
    return acc + (rank ? 1 / rank : 0);
  }, 0);
  return sum / perBrief.length;
}

/** Hit rate at k: share of briefs with at least one acceptable ad in the top k. */
export function hitRate(perBrief: { returnedIds: string[]; acceptable: string[] }[], k = 5): number {
  if (perBrief.length === 0) return 0;
  const hits = perBrief.filter((b) => isHit(b.returnedIds, b.acceptable, k)).length;
  return hits / perBrief.length;
}
