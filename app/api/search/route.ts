import { z } from "zod";
import { missingConfig, missingConfigMessage } from "@/lib/config";
import { db } from "@/lib/db";
import { MAX_LIMIT, searchReferences } from "@/lib/search";
import { FORMATS, LANGUAGES } from "@/lib/taxonomy";

const BodySchema = z.object({
  brief: z.string().trim().min(1, "Write a brief first").max(2000),
  format: z.enum(FORMATS).optional(),
  language: z.enum(LANGUAGES).optional(),
  limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
});

const EMPTY_LIBRARY = "The ad library is empty. Collect the ads, then run npm run tag and npm run load.";

/** Postgres "undefined_table": the ads table hasn't been created by npm run load yet. */
function isMissingTable(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "42P01";
}

async function libraryIsEmpty(): Promise<boolean> {
  const [{ count }] = (await db().query("select count(*)::int as count from ads where embedding is not null")) as { count: number }[];
  return count === 0;
}

export async function POST(request: Request) {
  const missing = missingConfig();
  if (missing.length) {
    return Response.json({ error: missingConfigMessage(missing) }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { brief, ...filters } = parsed.data;
  try {
    const result = await searchReferences(brief, filters);
    // No results with no filters can only mean there's nothing to search yet.
    if (result.results.length === 0 && (await libraryIsEmpty())) {
      return Response.json({ error: EMPTY_LIBRARY }, { status: 503 });
    }
    return Response.json(result);
  } catch (err) {
    if (isMissingTable(err)) return Response.json({ error: EMPTY_LIBRARY }, { status: 503 });
    console.error("search failed:", err);
    return Response.json({ error: "Something went wrong on the server. The details are in the server log." }, { status: 500 });
  }
}
