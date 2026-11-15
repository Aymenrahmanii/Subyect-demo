// Checks that each service in .env.local answers: npm run check
// Prints only pass/fail and non-secret facts, never key values.
import "./env";
import { z } from "zod";
import { db } from "../lib/db";
import { EMBEDDING_DIM, EMBEDDING_MODEL, embedOne } from "../lib/embed";
import { callJson, llmProvider } from "../lib/llm";

async function check(name: string, run: () => Promise<string>): Promise<boolean> {
  try {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("no answer within 30 s")), 30_000).unref());
    console.log(`OK    ${name}: ${await Promise.race([run(), timeout])}`);
    return true;
  } catch (err) {
    console.log(`FAIL  ${name}: ${(err as Error).message}`);
    return false;
  }
}

async function main() {
  const results = [
    await check("Neon", async () => {
      const [{ version }] = (await db().query("select version()")) as { version: string }[];
      const ext = (await db().query("select 1 from pg_available_extensions where name = 'vector'")) as unknown[];
      if (!ext.length) throw new Error("connected, but pgvector isn't available on this database");
      return `${version.split(" on ")[0]}, pgvector available`;
    }),
    await check("Voyage", async () => {
      const { vector, tokens } = await embedOne("magnesium supplement, problem hook", "query");
      return `${EMBEDDING_MODEL}, ${vector.length} dims (expected ${EMBEDDING_DIM}), ${tokens} tokens`;
    }),
    await check(`LLM (${llmProvider()})`, async () => {
      const { data, usage } = await callJson({
        schema: z.object({ answer: z.enum(["yes", "no"]) }),
        system: "Answer the question with JSON.",
        text: "Is a static ad an image (not a video)? Answer yes or no.",
        maxTokens: 500,
      });
      return `structured JSON ok (answer: ${data.answer}), ${usage.inputTokens} in / ${usage.outputTokens} out tokens`;
    }),
  ];
  if (results.includes(false)) process.exitCode = 1;
}

main();
