import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { JsonCall, JsonCallResult } from "./llm";

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

let client: Anthropic | undefined;
function claude(): Anthropic {
  client ??= new Anthropic();
  return client;
}

type ImageMediaType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

/**
 * Claude with structured outputs. Effort is low: tagging and reranking are short
 * judgement calls, and latency matters. Server-side fallbacks re-run the request
 * on another model if a safety classifier declines.
 */
export async function callClaudeJson<S extends z.ZodType>(call: JsonCall<S>): Promise<JsonCallResult<z.infer<S>>> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (call.image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: call.image.mediaType as ImageMediaType, data: call.image.base64 },
    });
  }
  content.push({ type: "text", text: call.text });

  const response = await claude().beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: call.maxTokens ?? 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(call.schema) },
    system: call.system,
    messages: [{ role: "user", content }],
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
