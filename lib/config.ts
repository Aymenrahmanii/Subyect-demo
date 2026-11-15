import { llmProvider } from "./llm";

type Env = Record<string, string | undefined>;

/** Names of the settings search needs that aren't set. Never returns values. */
export function missingConfig(env: Env = process.env): string[] {
  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.VOYAGE_API_KEY) missing.push("VOYAGE_API_KEY");
  if (llmProvider(env) === "gemini") {
    if (!env.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  } else if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) {
    missing.push("ANTHROPIC_API_KEY");
  }
  return missing;
}

export function missingConfigMessage(missing: string[]): string {
  return `Search isn't set up yet: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} missing. Add ${missing.length === 1 ? "it" : "them"} to .env.local and restart the server.`;
}
