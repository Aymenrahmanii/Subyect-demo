import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

let client: Anthropic | undefined;
function claude(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export interface JsonCallUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * One Claude call that must return JSON matching `schema` (structured outputs).
 * Effort is low: tagging and reranking are short judgement calls, and latency matters.
 * Server-side fallbacks re-run the request on another model if a safety classifier declines.
 */
export async function callJson<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  maxTokens?: number;
}): Promise<{ data: z.infer<S>; usage: JsonCallUsage }> {
  const response = await claude().beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined the request (${response.stop_details?.category ?? "no category"})`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude hit max_tokens before finishing the JSON");
  }
  if (response.parsed_output == null) {
    throw new Error("Claude returned no parseable JSON");
  }
  return {
    data: response.parsed_output as z.infer<S>,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}
