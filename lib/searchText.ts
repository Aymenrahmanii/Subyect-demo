import type { AdRow } from "./ads";
import type { Tags } from "./taxonomy";

const words = (value: string) => value.replaceAll("_", " ");

/** The one text field that gets embedded and keyword-indexed for each ad. */
export function buildSearchText(ad: AdRow, tags: Tags): string {
  const tagWords = [
    `${words(tags.hook_type)} hook`,
    `${words(tags.format)} format`,
    tags.offer === "none" ? "no offer" : `${words(tags.offer)} offer`,
    `product visibility ${tags.product_visibility}`,
    `${tags.text_density} text density`,
    tags.has_person ? "shows a person" : "no person",
    `language ${tags.language}`,
    `category ${words(ad.category)}`,
  ].join(", ");

  return [tags.angle, tags.summary, tags.headline_text, ad.primary_text, tagWords]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * OR-query for the keyword baseline. plainto_tsquery ANDs every word, which
 * matches nothing for a sentence-long brief.
 */
export function buildOrTsQuery(text: string): string | null {
  const terms = [...new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].filter((t) => t.length > 2);
  return terms.length ? terms.join(" | ") : null;
}
