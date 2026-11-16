import { z } from "zod";
import type { JsonCall, JsonCallResult } from "./llm";

// Pinned rather than an alias (gemini-flash-latest hung in testing on 2026-11-15).
// Lite: reads images, follows JSON schemas, ~1.5 s, and a larger free daily quota than
// gemini-2.5-flash, which ran out after ~20 tagging calls on 2026-11-16.
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

const MAX_ATTEMPTS = 4;
// Per-minute limits ask for seconds; a longer wait means the daily quota is gone.
const MAX_WAIT_MS = 60_000;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string; details?: { "@type"?: string; retryDelay?: string }[] };
}

/** JSON Schema for Gemini's responseJsonSchema, without the $schema header it doesn't need. */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** Seconds to wait from a 429's RetryInfo ("20s"), else exponential backoff. */
export function retryDelayMs(body: GeminiResponse | null, attempt: number): number {
  const delay = body?.error?.details?.find((d) => d["@type"]?.endsWith("RetryInfo"))?.retryDelay;
  const seconds = delay ? Number.parseFloat(delay) : NaN;
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) + 250 : 2000 * 2 ** attempt;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callGeminiJson<S extends z.ZodType>(call: JsonCall<S>): Promise<JsonCallResult<z.infer<S>>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set (put it in .env.local)");

  const parts: Record<string, unknown>[] = [];
  if (call.image) parts.push({ inlineData: { mimeType: call.image.mediaType, data: call.image.base64 } });
  parts.push({ text: call.text });

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: call.system }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: toGeminiSchema(call.schema),
      maxOutputTokens: call.maxTokens ?? 4000,
    },
  });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body,
      signal: AbortSignal.timeout(60_000),
    });
    const json = (await res.json().catch(() => null)) as GeminiResponse | null;

    // Free-tier rate limits (429) and overload (503) are normal: wait and retry,
    // unless Gemini asks for a long wait, which means the daily quota is used up.
    if ((res.status === 429 || res.status === 503) && attempt < MAX_ATTEMPTS - 1) {
      const wait = retryDelayMs(json, attempt);
      if (wait > MAX_WAIT_MS) {
        throw new Error(
          `Gemini quota for ${GEMINI_MODEL} is used up (retry in ${Math.round(wait / 3_600_000)} h). Set GEMINI_MODEL to another model in .env.local, or try again later.`,
        );
      }
      console.error(`Gemini ${res.status}, retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      throw new Error(`Gemini request failed: ${res.status} ${json?.error?.message ?? res.statusText}`);
    }

    if (json?.promptFeedback?.blockReason) throw new Error(`Gemini blocked the request (${json.promptFeedback.blockReason})`);
    const candidate = json?.candidates?.[0];
    if (candidate?.finishReason === "MAX_TOKENS") throw new Error("Gemini hit maxOutputTokens before finishing the JSON");
    const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error(`Gemini returned no content (${candidate?.finishReason ?? "no candidate"})`);

    // The schema constrains generation; validate anyway so bad output never reaches the database.
    const data = call.schema.parse(JSON.parse(text));
    return {
      data,
      usage: {
        inputTokens: json?.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: json?.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }
}
