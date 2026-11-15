import { z } from "zod";

// Fixed value lists: filters and evals only work when tags are consistent.
export const HOOK_TYPES = [
  "problem",
  "benefit",
  "social_proof",
  "offer",
  "curiosity",
  "comparison",
  "founder_story",
] as const;

export const FORMATS = [
  "product_on_color",
  "lifestyle",
  "ugc_screenshot",
  "testimonial",
  "before_after",
  "comparison_table",
  "text_only",
  "collage",
] as const;

export const OFFERS = ["none", "discount", "bundle", "free_shipping", "trial", "gift"] as const;
export const PRODUCT_VISIBILITY = ["none", "small", "hero"] as const;
export const TEXT_DENSITY = ["low", "medium", "high"] as const;
export const LANGUAGES = ["nl", "en", "other"] as const;

export type Format = (typeof FORMATS)[number];
export type Language = (typeof LANGUAGES)[number];

export const TagSchema = z.object({
  hook_type: z.enum(HOOK_TYPES),
  format: z.enum(FORMATS),
  offer: z.enum(OFFERS),
  product_visibility: z.enum(PRODUCT_VISIBILITY),
  text_density: z.enum(TEXT_DENSITY),
  has_person: z.boolean(),
  language: z.enum(LANGUAGES),
  headline_text: z.string().describe("Text on the image, copied exactly in its original language"),
  angle: z.string().describe("One sentence in English: the argument this ad makes"),
  summary: z.string().describe("Two sentences in English: what the ad shows and how it is laid out"),
});

export type Tags = z.infer<typeof TagSchema>;
