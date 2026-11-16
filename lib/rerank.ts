import { z } from "zod";

export interface Candidate {
  id: string;
  brand: string;
  category: string;
  format: string;
  hook_type: string;
  offer: string;
  language: string;
  product_visibility: string;
  text_density: string;
  has_person: boolean;
  headline_text: string;
  angle: string;
  summary: string;
  image_path: string;
  ad_library_url: string | null;
  days_running: number | null;
  similarity: number;
}

export interface RankedResult extends Candidate {
  reason: string;
}

export const MAX_PER_BRAND = 2;

export const RerankSchema = z.object({
  results: z.array(
    z.object({
      id: z.string().describe("An id copied exactly from the candidates"),
      reason: z.string().describe("One line: why this ad fits the brief"),
    }),
  ),
});

export type RerankPicks = z.infer<typeof RerankSchema>["results"];

export function rerankSystemPrompt(limit: number): string {
  return [
    "You pick reference ads for a creative strategist writing a static ad concept.",
    `From the candidate ads, return exactly ${limit} ads, best first, as JSON (fewer only if there are fewer candidates).`,
    "Rules:",
    "- Judge fit to the brief's hook, format and angle, not the product category alone.",
    `- Return at most ${MAX_PER_BRAND} ads per brand, so results stay varied.`,
    "- Use days_running only to break ties between otherwise equal ads, and mention it in the reason when it does.",
    "- Only return ids that appear in the candidates. Copy them exactly.",
    "- Each reason is one short line a strategist would find useful: say concretely what in this ad matches the brief",
    '  (e.g. "Dutch 20% korting headline over a flat orange product shot"), and note a mismatch if the fit is partial.',
    '  Never write a generic reason like "matches hook, format and angle".',
  ].join("\n");
}

/** Compact candidate view for the reranker: only what it needs to judge fit. */
export function rerankUserText(brief: string, candidates: Candidate[]): string {
  const view = candidates.map((c) => ({
    id: c.id,
    brand: c.brand,
    category: c.category,
    format: c.format,
    hook_type: c.hook_type,
    offer: c.offer,
    language: c.language,
    has_person: c.has_person,
    headline_text: c.headline_text,
    angle: c.angle,
    summary: c.summary,
    days_running: c.days_running,
  }));
  return `Brief:\n${brief}\n\nCandidates:\n${JSON.stringify(view, null, 1)}`;
}

/**
 * Applies the reranker's picks: drops ids that weren't candidates, duplicates and
 * brands past the cap, then backfills from vector order if fewer than `limit` remain.
 */
export function applyPicks(candidates: Candidate[], picks: RerankPicks, limit: number): RankedResult[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const perBrand = new Map<string, number>();
  const chosen: RankedResult[] = [];
  const seen = new Set<string>();

  const tryAdd = (candidate: Candidate, reason: string) => {
    if (chosen.length >= limit || seen.has(candidate.id)) return;
    const count = perBrand.get(candidate.brand) ?? 0;
    if (count >= MAX_PER_BRAND) return;
    seen.add(candidate.id);
    perBrand.set(candidate.brand, count + 1);
    chosen.push({ ...candidate, reason: reason.trim() });
  };

  for (const pick of picks) {
    const candidate = byId.get(pick.id.trim());
    if (candidate) tryAdd(candidate, pick.reason);
  }
  for (const candidate of candidates) {
    tryAdd(candidate, "Close match by embedding similarity (not picked by the reranker)");
  }
  return chosen;
}
