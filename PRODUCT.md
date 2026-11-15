# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Creative strategists at a DTC performance ad agency. They are mid-way through writing a concept brief for a static Meta ad (hook, angle, format) and need a few proven reference ads to point a designer at. Secondary audience: a hiring manager (Bas) watching a short demo of the tool on a screen share and in a 90-second recording.

## Product Purpose

Type a concept brief, get the five best reference ads from a tagged library, each with a one-line reason it fits. Success: a strategist finds a usable reference in one search instead of scrolling the Ad Library; in the demo, the viewer understands what it does within one search.

## Positioning

Search by concept, not by keyword: a vision model tags every ad into fixed lists (hook, format, offer, language), the brief is matched by meaning across Dutch and English ads, and an LLM rerank explains each pick. The same search is also an MCP tool that agents call while planning concepts.

## Operating Context

Used on a laptop while writing briefs. For the demo: a ~1440px browser shared over a video call, plus a screen recording. Results show the ad image, brand, reason, tags, days running and a link to the Meta Ad Library.

## Capabilities and Constraints

- One page: brief box, optional format and language filters, example briefs, five result cards, search time.
- Library: ~60 public static ads from 8 DTC brands across 4 categories, some in Dutch. Statics only.
- Days running is a rough proxy for performance, never presented as proof.
- Stack: Next.js 16 app, Postgres on Neon with pgvector, Voyage embeddings, Claude for tagging and rerank.

## Brand Commitments

Name shown: "Reference search". No agency branding or anything that passes as the hiring agency's product.

## Evidence on Hand

Real ads saved by hand from the Meta Ad Library (data/ads/, not yet collected). Eval hit rates come from scripts/eval.ts. No customers, testimonials or performance data exist; none may be invented.

## Product Principles

- The ads are the content; the interface frames them and gets out of the way.
- Every result explains itself in one line a strategist would agree with.
- Honest about limits: proxies are labeled as proxies.
- Other brands' creative is shown for reference, never republished as ours.
