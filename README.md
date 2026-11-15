# Reference search

Type a concept brief for a static ad and get the five best reference ads from a library of public DTC ads, each with a one-line reason. It works from a web page and as an MCP tool in Claude Code.

## How it works

1. **Collect**: 60 static ads from 8 DTC brands, saved by hand from the Meta Ad Library (`data/ads/`, `data/ads.csv`).
2. **Tag**: each ad is tagged once by a vision model into fixed value lists (`scripts/tag.ts`, schema in `lib/taxonomy.ts`).
3. **Store**: tags plus a Voyage `voyage-3.5` embedding go into one Postgres table on Neon with pgvector (`db/schema.sql`, `scripts/load.ts`).
4. **Search**: embed the brief, fetch 20 candidates with optional filters, then a Claude rerank picks the best 5, at most 2 per brand (`lib/search.ts`).
5. **Expose**: the same function as the MCP tool `search_references` (`mcp/server.ts`).
6. **Measure**: hit rate at 5 on 12 test briefs against a keyword baseline (`scripts/eval.ts`).

The page, the MCP tool and the eval all call one function, `searchReferences` in `lib/search.ts`.

## Results

| Variant | Hit rate at 5 (12 briefs) |
|---|---|
| Keyword baseline (Postgres full-text) | _run `npm run eval`_ |
| Vector only | |
| Vector plus rerank | |

Tag check: checked 10 ads by hand and agreed with __ of 100 fields.

Typical search: __ s and __ tokens (shown under the results on the page).

## Limits

- 60 ads is a small library, and all of them are statics.
- One person judged the eval, on 12 briefs: it's a smoke test, not a benchmark.
- Days running is a proxy for performance, not real results.

## With real data, next

- Real spend and results replace days running as the winner signal.
- Every ad carries its briefing id, so the system learns which ideas win.
- The references strategists actually picked become the eval set.
- At 6,469 ads, add an HNSW index. Tagging stays a one-time batch, and the rerank still sees 20 candidates.

## What the AI wrote and what I changed

_Two concrete examples, written after reading the code._

## Run it

Requires Node 20+, a Neon project, an Anthropic API key and a Voyage API key.

```bash
npm install
cp .env.example .env.local        # fill in DATABASE_URL, ANTHROPIC_API_KEY, VOYAGE_API_KEY
# put images in data/ads/ and rows in data/ads.csv (see data/ads.example.csv)
npm run tag                       # vision tags -> data/tags/<id>.json (skips ads already tagged)
npm run load                      # creates the table, embeds, upserts, copies images to public/ads/
npm run try                       # 5 sample briefs in the terminal
npm run eval                      # needs data/eval.json (see data/eval.example.json)
npm run dev                       # http://localhost:3000
```

Register the MCP tool with Claude Code (run from this folder), then check it with `/mcp`:

```bash
claude mcp add --transport stdio refsearch -- npx tsx mcp/server.ts
```

Tests and checks: `npm test`, `npm run typecheck`, `npm run lint`.

The ads are other brands' creative work: keep the repo private and any deployed link unlisted, and take it down afterwards.
