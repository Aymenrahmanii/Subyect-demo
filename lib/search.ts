import { publicImageUrl } from "./ads";
import { callJson } from "./llm";
import { db, toVectorLiteral } from "./db";
import { embedOne } from "./embed";
import { applyPicks, rerankSystemPrompt, rerankUserText, RerankSchema, type Candidate, type RankedResult } from "./rerank";
import { buildOrTsQuery } from "./searchText";
import type { Format, Language } from "./taxonomy";

export const CANDIDATE_COUNT = 20;
export const DEFAULT_LIMIT = 5;
export const MAX_LIMIT = 10;

export interface SearchFilters {
  format?: Format;
  language?: Language;
  limit?: number;
}

export interface SearchResult extends RankedResult {
  image_url: string;
}

export interface SearchStats {
  ms: number;
  embedMs: number;
  dbMs: number;
  rerankMs: number;
  embedTokens: number;
  inputTokens: number;
  outputTokens: number;
}

const CANDIDATE_COLUMNS = `
  id, brand, category, format, hook_type, offer, language, product_visibility,
  text_density, has_person, coalesce(headline_text, '') as headline_text,
  coalesce(angle, '') as angle, coalesce(summary, '') as summary,
  image_path, ad_library_url,
  coalesce(ended_on, current_date) - started_on as days_running`;

/** Nearest ads by cosine distance; filters apply only when passed. */
export async function fetchCandidates(vector: number[], filters: SearchFilters, k = CANDIDATE_COUNT): Promise<Candidate[]> {
  const rows = await db().query(
    `select ${CANDIDATE_COLUMNS},
            1 - (embedding <=> $1::vector) as similarity
     from ads
     where embedding is not null
       and ($2::text is null or format = $2)
       and ($3::text is null or language = $3)
     order by embedding <=> $1::vector
     limit $4`,
    [toVectorLiteral(vector), filters.format ?? null, filters.language ?? null, k],
  );
  return rows as Candidate[];
}

const withImage = (r: RankedResult): SearchResult => ({ ...r, image_url: publicImageUrl(r.image_path) });

function clampLimit(limit: number | undefined): number {
  return Math.min(Math.max(Math.trunc(limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
}

/** The one search: embed brief -> 20 candidates from Postgres -> LLM rerank to the best few. */
export async function searchReferences(
  brief: string,
  filters: SearchFilters = {},
  // The eval passes the brief's vector so each brief is embedded only once.
  precomputedVector?: number[],
): Promise<{ results: SearchResult[]; stats: SearchStats }> {
  const limit = clampLimit(filters.limit);
  const t0 = performance.now();

  const { vector, tokens: embedTokens } = precomputedVector
    ? { vector: precomputedVector, tokens: 0 }
    : await embedOne(brief, "query");
  const t1 = performance.now();

  const candidates = await fetchCandidates(vector, filters);
  const t2 = performance.now();

  let picks: { id: string; reason: string }[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  if (candidates.length > 0) {
    const { data, usage } = await callJson({
      schema: RerankSchema,
      system: rerankSystemPrompt(limit),
      text: rerankUserText(brief, candidates),
    });
    picks = data.results;
    inputTokens = usage.inputTokens;
    outputTokens = usage.outputTokens;
  }
  const t3 = performance.now();

  const results = applyPicks(candidates, picks, limit).map(withImage);
  const stats: SearchStats = {
    ms: Math.round(t3 - t0),
    embedMs: Math.round(t1 - t0),
    dbMs: Math.round(t2 - t1),
    rerankMs: Math.round(t3 - t2),
    embedTokens,
    inputTokens,
    outputTokens,
  };
  // stderr, never stdout: stdout carries the MCP stdio protocol.
  console.error(JSON.stringify({ event: "search", brief: brief.slice(0, 80), ...stats }));
  return { results, stats };
}

/** Eval variant: top-k by embedding distance, no rerank. */
export async function vectorOnlySearch(brief: string, k = DEFAULT_LIMIT, precomputedVector?: number[]): Promise<Candidate[]> {
  const vector = precomputedVector ?? (await embedOne(brief, "query")).vector;
  return fetchCandidates(vector, {}, k);
}

/** Eval baseline: Postgres full-text search on the generated tsv column. */
export async function keywordSearch(brief: string, k = DEFAULT_LIMIT): Promise<Candidate[]> {
  const tsQuery = buildOrTsQuery(brief);
  if (!tsQuery) return [];
  const rows = await db().query(
    `select ${CANDIDATE_COLUMNS},
            ts_rank(tsv, to_tsquery('simple', $1)) as similarity
     from ads
     where tsv @@ to_tsquery('simple', $1)
     order by similarity desc
     limit $2`,
    [tsQuery, k],
  );
  return rows as Candidate[];
}
