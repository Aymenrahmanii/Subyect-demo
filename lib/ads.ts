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
  // Empty while the ad is still running.
  ended_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "ended_on must be YYYY-MM-DD")
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

/**
 * The image's real type from its first bytes. Browsers often save WebP or JPEG
 * under a .png name, and the model needs the true type. Throws on an empty or
 * non-image file (an HTML page saved as .png, for instance).
 */
export function sniffImageType(bytes: Uint8Array, name: string): ImageMediaType {
  if (bytes.length === 0) throw new Error(`${name} is empty (0 bytes). Save the ad image again.`);
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  throw new Error(`${name} isn't a PNG, JPEG, WebP or GIF image. It may be a saved web page; save the image itself.`);
}

/** Public URL of the copy that scripts/load.ts places in public/ads/. */
export function publicImageUrl(imagePath: string): string {
  const name = imagePath.split(/[\\/]/).pop() ?? imagePath;
  return `/ads/${name}`;
}
