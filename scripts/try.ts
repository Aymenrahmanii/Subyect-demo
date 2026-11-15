// Prints the top 5 for a few briefs: npm run try  (or: npm run try -- "your brief")
import "./env";
import { searchReferences } from "../lib/search";

const DEFAULT_BRIEFS = [
  "Static for a magnesium supplement, problem-first hook about bad sleep, Dutch, no person in the image.",
  "Skincare serum, social proof with a customer review front and centre, clean product shot.",
  "Snack brand running a bundle deal, bold offer headline, lots of colour.",
  "Apparel brand, lifestyle shot of someone wearing the product outdoors, minimal text.",
  "Comparison ad showing why our protein powder beats the cheap supermarket option.",
];

async function main() {
  const briefs = process.argv.slice(2).length ? [process.argv.slice(2).join(" ")] : DEFAULT_BRIEFS;
  for (const brief of briefs) {
    const { results, stats } = await searchReferences(brief);
    console.log(`\n> ${brief}`);
    console.log(`  ${stats.ms} ms (embed ${stats.embedMs}, db ${stats.dbMs}, rerank ${stats.rerankMs}), ${stats.inputTokens} in / ${stats.outputTokens} out tokens`);
    for (const [i, r] of results.entries()) {
      const days = r.days_running == null ? "" : `, ${r.days_running}d running`;
      console.log(`  ${i + 1}. ${r.id} [${r.hook_type} / ${r.format} / ${r.language}${days}]`);
      console.log(`     ${r.reason}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
