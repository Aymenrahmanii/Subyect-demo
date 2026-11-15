import { describe, expect, it } from "vitest";
import { mediaTypeFor, parseAdsCsv, publicImageUrl } from "../lib/ads";
import { missingConfig, missingConfigMessage } from "../lib/config";
import { hitRate, isHit } from "../lib/metrics";
import { applyPicks, MAX_PER_BRAND, type Candidate } from "../lib/rerank";
import { buildOrTsQuery, buildSearchText } from "../lib/searchText";
import { TagSchema, type Tags } from "../lib/taxonomy";

const tags: Tags = {
  hook_type: "social_proof",
  format: "product_on_color",
  offer: "none",
  product_visibility: "hero",
  text_density: "low",
  has_person: false,
  language: "nl",
  headline_text: "Beter slapen in 7 dagen",
  angle: "Customers say they sleep better within a week.",
  summary: "A magnesium tub on a blue background. A review quote sits above it.",
};

function candidate(id: string, brand: string): Candidate {
  return {
    id, brand, category: "supplements", format: "product_on_color", hook_type: "problem", offer: "none",
    language: "nl", product_visibility: "hero", text_density: "low", has_person: false, headline_text: "",
    angle: "", summary: "", image_path: `data/ads/${id}.png`, ad_library_url: null, days_running: 10, similarity: 0.5,
  };
}

describe("parseAdsCsv", () => {
  it("parses rows, quoted captions and a BOM", () => {
    const csv = '﻿id,brand,category,image_path,ad_library_url,started_on,primary_text\n' +
      'a-01,A,skincare,data/ads/a-01.png,https://x,2026-08-02,"Hi, there"\n';
    expect(parseAdsCsv(csv)).toEqual([
      { id: "a-01", brand: "A", category: "skincare", image_path: "data/ads/a-01.png", ad_library_url: "https://x", started_on: "2026-08-02", primary_text: "Hi, there" },
    ]);
  });

  it("names the row when a date is malformed", () => {
    const csv = "id,brand,category,image_path,started_on\na-01,A,skincare,x.png,02/08/2026\n";
    expect(() => parseAdsCsv(csv)).toThrow(/row 2: started_on/);
  });
});

describe("image helpers", () => {
  it("maps extensions to media types", () => {
    expect(mediaTypeFor("data/ads/x.PNG")).toBe("image/png");
    expect(mediaTypeFor("x.jpeg")).toBe("image/jpeg");
    expect(() => mediaTypeFor("x.bmp")).toThrow();
  });

  it("serves images from /ads/", () => {
    expect(publicImageUrl("data/ads/brand-03.png")).toBe("/ads/brand-03.png");
    expect(publicImageUrl("data\\ads\\brand-03.png")).toBe("/ads/brand-03.png");
  });
});

describe("TagSchema", () => {
  it("rejects values outside the fixed lists", () => {
    expect(TagSchema.safeParse(tags).success).toBe(true);
    expect(TagSchema.safeParse({ ...tags, format: "carousel" }).success).toBe(false);
  });
});

describe("buildSearchText", () => {
  it("includes the free text and the tags written as words", () => {
    const ad = { id: "a", brand: "A", category: "food_and_drink", image_path: "a.png", ad_library_url: "", started_on: "", primary_text: "Nu 20% korting" };
    const text = buildSearchText(ad, tags);
    expect(text).toContain(tags.angle);
    expect(text).toContain("Beter slapen in 7 dagen");
    expect(text).toContain("Nu 20% korting");
    expect(text).toContain("social proof hook");
    expect(text).toContain("product on color format");
    expect(text).toContain("no person");
    expect(text).toContain("category food and drink");
  });
});

describe("buildOrTsQuery", () => {
  it("ORs unique words and drops punctuation and short words", () => {
    expect(buildOrTsQuery("Bad sleep? Bad sleep, at night!")).toBe("bad | sleep | night");
  });

  it("keeps accented letters and returns null for no terms", () => {
    expect(buildOrTsQuery("crème hydratée")).toBe("crème | hydratée");
    expect(buildOrTsQuery("?! a")).toBeNull();
  });
});

describe("applyPicks", () => {
  const candidates = [
    candidate("a-1", "A"), candidate("a-2", "A"), candidate("a-3", "A"),
    candidate("b-1", "B"), candidate("c-1", "C"), candidate("d-1", "D"),
  ];

  it("keeps the reranker's order and reasons", () => {
    const out = applyPicks(candidates, [{ id: "c-1", reason: "fits" }, { id: "b-1", reason: "also" }], 2);
    expect(out.map((r) => [r.id, r.reason])).toEqual([["c-1", "fits"], ["b-1", "also"]]);
  });

  it("drops unknown ids and duplicates, caps brands, then backfills by similarity", () => {
    const out = applyPicks(
      candidates,
      [
        { id: "made-up", reason: "x" },
        { id: "a-1", reason: "x" },
        { id: "a-1", reason: "dup" },
        { id: "a-2", reason: "x" },
        { id: "a-3", reason: "third from A" },
      ],
      5,
    );
    expect(out.map((r) => r.id)).toEqual(["a-1", "a-2", "b-1", "c-1", "d-1"]);
    expect(out.filter((r) => r.brand === "A")).toHaveLength(MAX_PER_BRAND);
    expect(out[2].reason).toMatch(/not picked by the reranker/);
  });

  it("returns fewer than the limit when there aren't enough candidates", () => {
    expect(applyPicks(candidates.slice(0, 3), [], 5).map((r) => r.id)).toEqual(["a-1", "a-2"]);
  });
});

describe("hit rate", () => {
  it("counts a hit only inside the top k", () => {
    expect(isHit(["x", "y", "z"], ["z"], 3)).toBe(true);
    expect(isHit(["v", "w", "x", "y", "z", "hit"], ["hit"], 5)).toBe(false);
  });

  it("averages over briefs", () => {
    const rate = hitRate([
      { returnedIds: ["a"], acceptable: ["a"] },
      { returnedIds: ["b"], acceptable: ["a"] },
      { returnedIds: ["c", "a"], acceptable: ["a"] },
      { returnedIds: [], acceptable: ["a"] },
    ]);
    expect(rate).toBe(0.5);
    expect(hitRate([])).toBe(0);
  });
});

describe("missingConfig", () => {
  it("names every missing setting and none of the values", () => {
    expect(missingConfig({})).toEqual(["DATABASE_URL", "VOYAGE_API_KEY", "ANTHROPIC_API_KEY"]);
    expect(missingConfig({ DATABASE_URL: "x", VOYAGE_API_KEY: "y", ANTHROPIC_AUTH_TOKEN: "z" })).toEqual([]);
  });

  it("reads naturally for one or several", () => {
    expect(missingConfigMessage(["VOYAGE_API_KEY"])).toBe(
      "Search isn't set up yet: VOYAGE_API_KEY is missing. Add it to .env.local and restart the server.",
    );
    expect(missingConfigMessage(["DATABASE_URL", "VOYAGE_API_KEY"])).toContain("are missing. Add them");
  });
});
