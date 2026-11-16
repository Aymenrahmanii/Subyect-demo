// Hit rate at 5 for three variants on data/eval.json: npm run eval
// Writes data/eval-results.json and prints a Markdown table for the README.
import { DATA_DIR } from "./env";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "../lib/db";
import { hitRate, isHit, meanReciprocalRank } from "../lib/metrics";
import { embedOne } from "../lib/embed";
import { keywordSearch, searchReferences, vectorOnlySearch } from "../lib/search";

const EvalSchema = z.array(z.object({ brief: z.string().min(1), acceptable: z.array(z.string()).min(1) }));

type Run = (brief: string, vector: number[]) => Promise<string[]>;

const VARIANTS: Record<string, Run> = {
  "Keyword baseline": async (brief) => (await keywordSearch(brief)).map((r) => r.id),
  "Vector only": async (brief, vector) => (await vectorOnlySearch(brief, 5, vector)).map((r) => r.id),
  "Vector plus rerank": async (brief, vector) => (await searchReferences(brief, {}, vector)).results.map((r) => r.id),
};

// Voyage allows 3 requests a minute without a payment method; space the embeddings out.
const EMBED_SPACING_MS = Number(process.env.EVAL_EMBED_SPACING_MS ?? 21_000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const cases = EvalSchema.parse(JSON.parse(await fs.readFile(path.join(DATA_DIR, "eval.json"), "utf8")));

  const known = new Set(((await db().query("select id from ads")) as { id: string }[]).map((r) => r.id));
  const unknown = cases.flatMap((c) => c.acceptable).filter((id) => !known.has(id));
  if (unknown.length) throw new Error(`eval.json names ids that aren't in the database: ${[...new Set(unknown)].join(", ")}`);

  // Embed each brief once and reuse the vector for both vector variants.
  const vectors: number[][] = [];
  for (const [i, c] of cases.entries()) {
    if (i > 0) await sleep(EMBED_SPACING_MS);
    vectors.push((await embedOne(c.brief, "query")).vector);
    console.log(`embedded brief ${i + 1}/${cases.length}`);
  }

  const report: Record<
    string,
    { hitRate: number; perBrief: { brief: string; acceptable: string[]; returnedIds: string[]; hit: boolean }[] }
  > = {};
  for (const [name, run] of Object.entries(VARIANTS)) {
    const perBrief = [];
    for (const [i, c] of cases.entries()) {
      const returnedIds = await run(c.brief, vectors[i]);
      perBrief.push({ brief: c.brief, acceptable: c.acceptable, returnedIds, hit: isHit(returnedIds, c.acceptable) });
    }
    report[name] = { hitRate: hitRate(perBrief), perBrief };
    console.log(`${name}: ${perBrief.filter((b) => b.hit).length}/${cases.length}`);
  }

  await fs.writeFile(path.join(DATA_DIR, "eval-results.json"), JSON.stringify(report, null, 2) + "\n");

  // Hit@5 saturates on a small library, so also report hit@1 and MRR.
  console.log(`\n| Variant | Hit@5 | Hit@1 | MRR |\n|---|---|---|---|`);
  for (const [name, r] of Object.entries(report)) {
    const n = cases.length;
    const at5 = r.perBrief.filter((b) => isHit(b.returnedIds, b.acceptable, 5)).length;
    const at1 = r.perBrief.filter((b) => isHit(b.returnedIds, b.acceptable, 1)).length;
    console.log(`| ${name} | ${at5}/${n} | ${at1}/${n} | ${meanReciprocalRank(r.perBrief).toFixed(2)} |`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
