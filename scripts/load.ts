// Creates the table, joins ads.csv with data/tags/*.json, embeds, and upserts: npm run load
// Also copies images into public/ads/ so the page can show them.
import { ADS_CSV, ROOT, TAGS_DIR } from "./env";
import fs from "node:fs/promises";
import path from "node:path";
import { parseAdsCsv } from "../lib/ads";
import { db, toVectorLiteral } from "../lib/db";
import { embed } from "../lib/embed";
import { buildSearchText } from "../lib/searchText";
import { TagSchema } from "../lib/taxonomy";

const BATCH = 32;

async function applySchema() {
  const sql = await fs.readFile(path.join(ROOT, "db", "schema.sql"), "utf8");
  const statements = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) await db().query(statement);
}

async function main() {
  await applySchema();

  const ads = parseAdsCsv(await fs.readFile(ADS_CSV, "utf8"));
  const rows = [];
  const missing: string[] = [];
  for (const ad of ads) {
    const tagFile = path.join(TAGS_DIR, `${ad.id}.json`);
    const raw = await fs.readFile(tagFile, "utf8").catch(() => null);
    if (raw === null) {
      missing.push(ad.id);
      continue;
    }
    const tags = TagSchema.parse(JSON.parse(raw));
    rows.push({ ad, tags, searchText: buildSearchText(ad, tags) });
  }
  if (missing.length) console.warn(`Skipping ${missing.length} untagged ads (run npm run tag): ${missing.join(", ")}`);
  if (rows.length === 0) {
    console.error(
      ads.length === 0
        ? "data/ads.csv has no rows yet. Add the ads, then run npm run tag before npm run load."
        : "None of the ads are tagged yet. Run npm run tag first.",
    );
    process.exit(1);
  }

  const publicDir = path.join(ROOT, "public", "ads");
  await fs.mkdir(publicDir, { recursive: true });

  let embedTokens = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { vectors, tokens } = await embed(batch.map((r) => r.searchText), "document");
    embedTokens += tokens;
    for (const [j, { ad, tags, searchText }] of batch.entries()) {
      await db().query(
        `insert into ads (id, brand, category, image_path, ad_library_url, started_on, primary_text,
                          hook_type, format, offer, product_visibility, text_density, has_person, language,
                          headline_text, angle, summary, search_text, embedding, ended_on)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::vector,$20)
         on conflict (id) do update set
           brand = excluded.brand, category = excluded.category, image_path = excluded.image_path,
           ad_library_url = excluded.ad_library_url, started_on = excluded.started_on, ended_on = excluded.ended_on,
           primary_text = excluded.primary_text, hook_type = excluded.hook_type, format = excluded.format,
           offer = excluded.offer, product_visibility = excluded.product_visibility,
           text_density = excluded.text_density, has_person = excluded.has_person,
           language = excluded.language, headline_text = excluded.headline_text, angle = excluded.angle,
           summary = excluded.summary, search_text = excluded.search_text, embedding = excluded.embedding`,
        [
          ad.id, ad.brand, ad.category, ad.image_path, ad.ad_library_url || null, ad.started_on || null,
          ad.primary_text || null, tags.hook_type, tags.format, tags.offer, tags.product_visibility,
          tags.text_density, tags.has_person, tags.language, tags.headline_text, tags.angle, tags.summary,
          searchText, toVectorLiteral(vectors[j]), ad.ended_on || null,
        ],
      );
      await fs.copyFile(path.resolve(ROOT, ad.image_path), path.join(publicDir, path.basename(ad.image_path)));
    }
    console.log(`  loaded ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  const [{ count }] = (await db().query("select count(*)::int as count from ads where embedding is not null")) as { count: number }[];
  console.log(`Done. ${count} rows with embeddings in Postgres (${embedTokens} embedding tokens).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
