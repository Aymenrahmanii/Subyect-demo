import { describe, expect, it } from "vitest";
import { retryDelayMs, toGeminiSchema } from "../lib/gemini";
import { llmProvider } from "../lib/llm";
import { RerankSchema } from "../lib/rerank";
import { TagSchema } from "../lib/taxonomy";

describe("llmProvider", () => {
  it("prefers LLM_PROVIDER, then whichever key is set, Gemini first", () => {
    expect(llmProvider({ LLM_PROVIDER: "Anthropic", GEMINI_API_KEY: "g" })).toBe("anthropic");
    expect(llmProvider({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" })).toBe("gemini");
    expect(llmProvider({ ANTHROPIC_API_KEY: "a" })).toBe("anthropic");
    expect(llmProvider({})).toBe("gemini");
  });
});

describe("toGeminiSchema", () => {
  it("drops $schema and keeps the fixed value lists", () => {
    const schema = toGeminiSchema(TagSchema) as { $schema?: string; properties: Record<string, { enum?: string[] }>; required: string[] };
    expect(schema.$schema).toBeUndefined();
    expect(schema.properties.format.enum).toContain("product_on_color");
    expect(schema.required).toContain("hook_type");
  });

  it("describes the rerank array", () => {
    const schema = toGeminiSchema(RerankSchema) as { properties: { results: { type: string } } };
    expect(schema.properties.results.type).toBe("array");
  });
});

describe("retryDelayMs", () => {
  it("uses Gemini's RetryInfo delay when present", () => {
    const body = { error: { details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "20s" }] } };
    expect(retryDelayMs(body, 0)).toBe(20_250);
  });

  it("backs off exponentially otherwise", () => {
    expect(retryDelayMs(null, 0)).toBe(2000);
    expect(retryDelayMs(null, 2)).toBe(8000);
  });
});
