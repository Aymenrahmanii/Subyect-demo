// Tags every ad in data/ads.csv once with a vision model: npm run tag
// Skips ads that already have data/tags/<id>.json, so reruns cost nothing.
// Delete a tag file to re-tag that ad.
import { ADS_CSV, ROOT, TAGS_DIR } from "./env";
import fs from "node:fs/promises";
import path from "node:path";
import { parseAdsCsv, sniffImageType, type AdRow, type ImageMediaType } from "../lib/ads";
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

interface Job {
  ad: AdRow;
  mediaType: ImageMediaType;
  base64: string;
}

async function tagOne({ ad, mediaType, base64 }: Job): Promise<{ tags: Tags; tokens: number }> {
  const call = () =>
    callJson({
      schema: TagSchema,
      system: SYSTEM,
      image: { mediaType, base64 },
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
  if (ads.length === 0) {
    console.error("data/ads.csv has no rows yet. Save the ad images in data/ads/ and add one row per ad (see data/ads.example.csv).");
    process.exit(1);
  }
  await fs.mkdir(TAGS_DIR, { recursive: true });

  // Check every image before spending any API calls: missing, empty or non-image files fail here.
  const todo: Job[] = [];
  const badFiles: string[] = [];
  let alreadyTagged = 0;
  for (const ad of ads) {
    if (await exists(path.join(TAGS_DIR, `${ad.id}.json`))) {
      alreadyTagged++;
      continue;
    }
    const imageFile = path.resolve(ROOT, ad.image_path);
    if (!(await exists(imageFile))) {
      badFiles.push(`${ad.id}: image not found at ${ad.image_path}`);
      continue;
    }
    const bytes = await fs.readFile(imageFile);
    try {
      todo.push({ ad, mediaType: sniffImageType(bytes, ad.image_path), base64: bytes.toString("base64") });
    } catch (err) {
      badFiles.push(`${ad.id}: ${(err as Error).message}`);
    }
  }
  console.log(`${ads.length} ads in ads.csv, ${alreadyTagged} already tagged, ${todo.length} to tag`);
  if (badFiles.length) console.error(`Skipping ${badFiles.length} ads with a bad image file:\n  ${badFiles.join("\n  ")}`);

  let done = 0;
  let failed = badFiles.length;
  let tokens = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const { ad } = job;
      try {
        const result = await tagOne(job);
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
