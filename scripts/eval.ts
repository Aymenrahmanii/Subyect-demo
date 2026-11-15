// Hit rate at 5 for three variants on data/eval.json: npm run eval
// Writes data/eval-results.json and prints a Markdown table for the README.
import { DATA_DIR } from "./env";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "../lib/db";
import { hitRate, isHit } from "../lib/metrics";
import { keywordSearch, searchReferences, vectorOnlySearch } from "../lib/search";

const EvalSchema = z.array(z.object({ brief: z.string().min(1), acceptable: z.array(z.string()).min(1) }));

const VARIANTS = {
  "Keyword baseline": async (brief: string) => (await keywordSearch(brief)).map((r) => r.id),
  "Vector only": async (brief: string) => (await vectorOnlySearch(brief)).map((r) => r.id),
  "Vector plus rerank": async (brief: string) => (await searchReferences(brief)).results.map((r) => r.id),
} as const;

async function main() {
  const cases = EvalSchema.parse(JSON.parse(await fs.readFile(path.join(DATA_DIR, "eval.json"), "utf8")));

  const known = new Set(((await db().query("select id from ads")) as { id: string }[]).map((r) => r.id));
  const unknown = cases.flatMap((c) => c.acceptable).filter((id) => !known.has(id));
  if (unknown.length) throw new Error(`eval.json names ids that aren't in the database: ${[...new Set(unknown)].join(", ")}`);

  const report: Record<string, { hitRate: number; perBrief: { brief: string; returnedIds: string[]; hit: boolean }[] }> = {};
  for (const [name, run] of Object.entries(VARIANTS)) {
    const perBrief = [];
    for (const c of cases) {
      const returnedIds = await run(c.brief);
      perBrief.push({ brief: c.brief, acceptable: c.acceptable, returnedIds, hit: isHit(returnedIds, c.acceptable) });
    }
    report[name] = { hitRate: hitRate(perBrief), perBrief };
    console.log(`${name}: ${perBrief.filter((b) => b.hit).length}/${cases.length}`);
  }

  await fs.writeFile(path.join(DATA_DIR, "eval-results.json"), JSON.stringify(report, null, 2) + "\n");

  console.log(`\n| Variant | Hit rate at 5 (${cases.length} briefs) |\n|---|---|`);
  for (const [name, r] of Object.entries(report)) {
    const hits = r.perBrief.filter((b) => b.hit).length;
    console.log(`| ${name} | ${Math.round(r.hitRate * 100)}% (${hits}/${cases.length}) |`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
