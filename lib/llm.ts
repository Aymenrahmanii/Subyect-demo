import type { z } from "zod";

/** One provider-neutral request: a system prompt, user text, and an optional image. */
export interface JsonCall<S extends z.ZodType> {
  schema: S;
  system: string;
  text: string;
  image?: { mediaType: string; base64: string };
  maxTokens?: number;
}

export interface JsonCallUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface JsonCallResult<T> {
  data: T;
  usage: JsonCallUsage;
}

export type Provider = "gemini" | "anthropic";

type Env = Record<string, string | undefined>;

/** LLM_PROVIDER wins; otherwise whichever key is set, Gemini first. */
export function llmProvider(env: Env = process.env): Provider {
  const explicit = env.LLM_PROVIDER?.toLowerCase();
  if (explicit === "gemini" || explicit === "anthropic") return explicit;
  if (env.GEMINI_API_KEY) return "gemini";
  if (env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN) return "anthropic";
  return "gemini";
}

/** One LLM call that must return JSON matching `schema`. */
export async function callJson<S extends z.ZodType>(call: JsonCall<S>): Promise<JsonCallResult<z.infer<S>>> {
  if (llmProvider() === "anthropic") {
    const { callClaudeJson } = await import("./claude");
    return callClaudeJson(call);
  }
  const { callGeminiJson } = await import("./gemini");
  return callGeminiJson(call);
}
