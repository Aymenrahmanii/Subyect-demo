export interface EvalCase {
  brief: string;
  acceptable: string[];
}

/** True when at least one acceptable ad appears in the top k returned ids. */
export function isHit(returnedIds: string[], acceptable: string[], k = 5): boolean {
  const wanted = new Set(acceptable);
  return returnedIds.slice(0, k).some((id) => wanted.has(id));
}

/** Hit rate at k: share of briefs with at least one acceptable ad in the top k. */
export function hitRate(perBrief: { returnedIds: string[]; acceptable: string[] }[], k = 5): number {
  if (perBrief.length === 0) return 0;
  const hits = perBrief.filter((b) => isHit(b.returnedIds, b.acceptable, k)).length;
  return hits / perBrief.length;
}
