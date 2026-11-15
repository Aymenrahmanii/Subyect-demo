export const EMBEDDING_MODEL = process.env.VOYAGE_MODEL ?? "voyage-3.5";
export const EMBEDDING_DIM = 1024; // must match vector(1024) in db/schema.sql

type InputType = "document" | "query";

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
  usage: { total_tokens: number };
}

export interface EmbedResult {
  vectors: number[][];
  tokens: number;
}

/**
 * Embeds texts with Voyage. Ads are embedded as "document" and briefs as "query":
 * Voyage prepends a different instruction for each, which improves retrieval.
 */
export async function embed(texts: string[], inputType: InputType): Promise<EmbedResult> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set (put it in .env.local)");

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      input: texts,
      model: EMBEDDING_MODEL,
      input_type: inputType,
      output_dimension: EMBEDDING_DIM,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as VoyageResponse;
  const vectors = [...body.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
  for (const v of vectors) {
    if (v.length !== EMBEDDING_DIM) {
      throw new Error(`Expected ${EMBEDDING_DIM}-dim embeddings, got ${v.length}`);
    }
  }
  return { vectors, tokens: body.usage.total_tokens };
}

export async function embedOne(text: string, inputType: InputType): Promise<{ vector: number[]; tokens: number }> {
  const { vectors, tokens } = await embed([text], inputType);
  return { vector: vectors[0], tokens };
}
