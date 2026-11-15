import { parse } from "csv-parse/sync";
import { z } from "zod";

export const AdRowSchema = z.object({
  id: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  image_path: z.string().min(1),
  ad_library_url: z.string().default(""),
  started_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "started_on must be YYYY-MM-DD")
    .or(z.literal(""))
    .default(""),
  primary_text: z.string().default(""),
});

export type AdRow = z.infer<typeof AdRowSchema>;

/** Parses data/ads.csv; throws with the row number when a row is malformed. */
export function parseAdsCsv(csvText: string): AdRow[] {
  const records: Record<string, string>[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  return records.map((record, i) => {
    const result = AdRowSchema.safeParse(record);
    if (!result.success) {
      throw new Error(`ads.csv row ${i + 2}: ${result.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
    }
    return result.data;
  });
}

const MEDIA_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
} as const;

export type ImageMediaType = (typeof MEDIA_TYPES)[keyof typeof MEDIA_TYPES];

export function mediaTypeFor(path: string): ImageMediaType {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  const type = MEDIA_TYPES[ext as keyof typeof MEDIA_TYPES];
  if (!type) throw new Error(`Unsupported image type for ${path} (use png, jpg, webp or gif)`);
  return type;
}

/** Public URL of the copy that scripts/load.ts places in public/ads/. */
export function publicImageUrl(imagePath: string): string {
  const name = imagePath.split(/[\\/]/).pop() ?? imagePath;
  return `/ads/${name}`;
}
