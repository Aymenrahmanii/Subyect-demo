// Tags every ad in data/ads.csv once with a vision model: npm run tag
// Skips ads that already have data/tags/<id>.json, so reruns cost nothing.
// Delete a tag file to re-tag that ad.
import { ADS_CSV, ROOT, TAGS_DIR } from "./env";
import fs from "node:fs/promises";
import path from "node:path";
import { mediaTypeFor, parseAdsCsv, type AdRow } from "../lib/ads";
import { callJson, llmProvider } from "../lib/llm";
import { TagSchema, type Tags } from "../lib/taxonomy";

// Gemini's free tier allows only a few requests per minute; the client also retries 429s.
const CONCURRENCY = llmProvider() === "gemini" ? 1 : 4;

const SYSTEM = `You tag static social media ads for a searchable reference library.
Return one JSON object describing the ad image.

Rules:
1. Use only the listed values for each enum field. When unsure, pick the closest one.
2. Copy on-image text exactly into headline_text, in its original language. Use "" if there is none.
3. Describe what is visible. Do not guess how the ad performed.
4. Write angle and summary in English, even for Dutch ads, so search works across languages.

Value definitions:
- hook_type: problem (opens on a pain point), benefit (leads with an outcome), social_proof (reviews, ratings, customer counts, press), offer (leads with a deal), curiosity (teaser or question), comparison (vs. alternative or competitor), founder_story (founder speaks or is shown).
- format: product_on_color (product on a plain or colored background), lifestyle (product in a real-life scene), ugc_screenshot (looks like a phone screenshot, chat, or social post), testimonial (customer quote is the main element), before_after, comparison_table (side-by-side table or checklist), text_only (no product image), collage (several images combined).
- offer: none, discount (percentage or price off), bundle, free_shipping, trial, gift (free item with purchase).
- product_visibility: none, small (present but not the focus), hero (the main subject).
- text_density: low (a few words), medium (a headline and a line or two), high (paragraphs or many callouts).
- has_person: true if any person or body part is visible.
- language: the language of the on-image text (nl, en, other). Use the caption if the image has no text.`;

async function exists(file: string): Promise<boolean> {
  return fs.access(file).then(() => true, () => false);
}

async function tagOne(ad: AdRow): Promise<{ tags: Tags; tokens: number }> {
  const imageFile = path.resolve(ROOT, ad.image_path);
  const data = (await fs.readFile(imageFile)).toString("base64");
  const call = () =>
    callJson({
      schema: TagSchema,
      system: SYSTEM,
      image: { mediaType: mediaTypeFor(ad.image_path), base64: data },
      text: `Brand: ${ad.brand}\nCategory: ${ad.category}\nCaption above the image:\n${ad.primary_text || "(none)"}`,
    });
  let result;
  try {
    result = await call();
  } catch (err) {
    console.error(`  ${ad.id}: first attempt failed (${(err as Error).message}), retrying once`);
    result = await call();
  }
  // Validate again: the file on disk is the source of truth for load.ts.
  return { tags: TagSchema.parse(result.data), tokens: result.usage.inputTokens + result.usage.outputTokens };
}

async function main() {
  const ads = parseAdsCsv(await fs.readFile(ADS_CSV, "utf8"));
  await fs.mkdir(TAGS_DIR, { recursive: true });

  const todo: AdRow[] = [];
  for (const ad of ads) {
    if (!(await exists(path.resolve(ROOT, ad.image_path)))) throw new Error(`${ad.id}: image not found at ${ad.image_path}`);
    if (!(await exists(path.join(TAGS_DIR, `${ad.id}.json`)))) todo.push(ad);
  }
  console.log(`${ads.length} ads in ads.csv, ${ads.length - todo.length} already tagged, ${todo.length} to tag`);

  let done = 0;
  let failed = 0;
  let tokens = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let ad = queue.shift(); ad; ad = queue.shift()) {
      try {
        const result = await tagOne(ad);
        await fs.writeFile(path.join(TAGS_DIR, `${ad.id}.json`), JSON.stringify(result.tags, null, 2) + "\n");
        tokens += result.tokens;
        console.log(`  [${++done}/${todo.length}] ${ad.id}: ${result.tags.hook_type} / ${result.tags.format}`);
      } catch (err) {
        failed++;
        console.error(`  ${ad.id}: FAILED after retry: ${(err as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Done. Tagged ${done}, failed ${failed}, ~${tokens} tokens.`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
