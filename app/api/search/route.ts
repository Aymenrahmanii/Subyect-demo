import { z } from "zod";
import { missingConfig, missingConfigMessage } from "@/lib/config";
import { MAX_LIMIT, searchReferences } from "@/lib/search";
import { FORMATS, LANGUAGES } from "@/lib/taxonomy";

const BodySchema = z.object({
  brief: z.string().trim().min(1, "Write a brief first").max(2000),
  format: z.enum(FORMATS).optional(),
  language: z.enum(LANGUAGES).optional(),
  limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
});

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
    return Response.json(await searchReferences(brief, filters));
  } catch (err) {
    console.error("search failed:", err);
    return Response.json({ error: "Something went wrong on the server. The details are in the server log." }, { status: 500 });
  }
}
