---
name: Reference search
description: A darkroom contact sheet where the reranker's picks are circled in grease pencil.
colors:
  sheet: "#141414"
  sheet-raised: "#1b1b1b"
  film: "#050505"
  rule: "#2b2b2a"
  rule-strong: "#43433f"
  proof: "#e6e6e3"
  proof-dim: "#a8a8a2"
  proof-faint: "#8d8d88"
  edge: "#f2c21b"
  grease: "#e0352b"
  grease-press: "#c9301f"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2.1vw, 1.75rem)"
    fontWeight: 400
    lineHeight: 1.375
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "\"tnum\" 1"
  body-sm:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.375
  label:
    fontFamily: "Archivo Narrow, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.09em"
    fontFeature: "\"tnum\" 1"
  numeral:
    fontFamily: "Permanent Marker, cursive"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1
rounded:
  none: "0px"
spacing:
  frame-pad: "10px"
  gutter: "20px"
  row: "24px"
  page-x-mobile: "16px"
  page-x: "32px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.grease-press}"
    textColor: "#ffffff"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.grease}"
  button-primary-disabled:
    backgroundColor: "#3a3a37"
    textColor: "#9a9a94"
  select-field:
    backgroundColor: "{colors.sheet-raised}"
    textColor: "{colors.proof}"
    rounded: "{rounded.none}"
    padding: "0 40px 0 12px"
    height: "44px"
  brief-field:
    backgroundColor: "transparent"
    textColor: "{colors.proof}"
    typography: "{typography.display}"
    rounded: "{rounded.none}"
    padding: "0 0 12px 0"
  film-frame:
    backgroundColor: "{colors.film}"
    textColor: "{colors.edge}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "{spacing.frame-pad}"
  example-label:
    backgroundColor: "transparent"
    textColor: "{colors.proof-dim}"
    typography: "{typography.body}"
    padding: "12px 0 0 0"
  grease-rank:
    textColor: "{colors.grease}"
    typography: "{typography.numeral}"
---

# Design System: Reference search

## Overview

**Creative North Star: "Contact Sheet & Grease Pencil"**

Picking references is a picture edit. The interface is a darkroom proof sheet: a charcoal ground, each ad held in a black film frame with edge print running beneath it, and a single grease-pencil red that is the editor's hand. The reranker's picks are not badged or highlighted; they are circled, wobbly and waxy, and numbered in marker in the order they were chosen. Everything else stays quiet so the ads, which are the content, carry the colour.

Density is that of a working sheet, not a dashboard: one slate for the brief, one row of controls in edge print, then a strip of five equal frames at desktop width. Structure comes from hairline rules and the black of the film, never from cards, fills, or elevation. The system is dark only; it is built to read on a screen share.

**Key Characteristics:**
- Charcoal sheet, black film frames, hairline rules; square corners everywhere.
- Amber edge print (narrow tracked caps) for metadata, labels and frame numbers.
- Grease-pencil red is the only mark: picks, rank numerals, focus, the primary action, the caret, selection.
- Hand-drawn marks are real geometry with an SVG wax filter, never a raster or an icon.
- Motion is photographic: frames develop, then the pencil circles them in rank order.

## Colors

A near-achromatic darkroom palette with two working inks: film-edge amber for information, grease-pencil red for judgement.

### Primary
- **Grease Pencil Red** (`grease`): the editor's mark. Circles around picks, rank numerals, focus outlines, the brief field's focus underline, caret, text selection, link-underline hover, the error headline.
- **Pressed Grease** (`grease-press`): the resting fill of the primary action, one step deeper so the hover to `grease` reads as the pencil pressing down. Carries white text.

### Secondary
- **Film-Edge Amber** (`edge`): edge print on film frames (frame number, days live), the Brief field label, example-brief labels, the loading status and the proxy caveat. Used at 70-80% opacity for resting or empty states, full strength on hover and on developed frames.

### Neutral
- **Charcoal Sheet** (`sheet`): page ground, rail, and the halo colour behind marks.
- **Raised Sheet** (`sheet-raised`): fill of select fields; the only raised surface.
- **Film Black** (`film`): the frame border around every ad and every blank frame.
- **Hairline** (`rule`): section dividers and the top rule over each example brief.
- **Strong Hairline** (`rule-strong`): field borders, the brief field's resting underline, link underlines, scrollbar thumb.
- **Proof Grey** (`proof`): reading text, headings, field values.
- **Dim Proof** (`proof-dim`): secondary text, filter labels, tag lines, rail facts, the select chevron.
- **Faint Proof** (`proof-faint`): placeholder text and empty-frame guidance only.

### Named Rules
**The One Mark Rule.** Grease red means "chosen" or "act here". It never decorates, never fills a panel, and never appears as a second accent next to another mark colour.

**The Ink Split Rule.** Amber informs, red judges. Metadata and labels are amber or grey; anything that ranks, selects, or commits is red.

## Typography

**Body Font:** Archivo (with system-ui, sans-serif)
**Label Font:** Archivo Narrow, 500/600 (edge print)
**Mark Font:** Permanent Marker (rank numerals only)

**Character:** A plain, slightly condensed grotesque for reading, a narrow tracked uppercase for everything the film stock would print on its own edge, and one handwritten face reserved for the pencil. Tabular figures are on globally so counts and days align.

### Hierarchy
- **Display** (400, clamp(1.25rem, 2.1vw, 1.75rem), 1.375, -0.015em): the brief as it is typed; the largest text on the page is the user's own words.
- **Headline** (600, 15px, -0.01em): product name in the rail, the sheet heading, the primary button.
- **Title** (600, 16px, 1.25, -0.01em): brand name under each frame.
- **Body** (400, 14px, 1.45): pick reasons, example briefs, select values, error text. Long-form notes cap at 60ch.
- **Body Small** (400, 13px, 1.375): link text, empty-frame guidance.
- **Label / Edge Print** (600, 0.75rem, 0.09em, uppercase, tabular): frame numbers, days live, tags, field labels, status lines, rail facts.
- **Numeral** (Permanent Marker 400, 40px, 1): the rank written beside each pick, tilted -6deg.

### Named Rules
**The Marker Is Only For Ranks Rule.** Permanent Marker appears only as the handwritten rank numeral. It is never used for words, headings, or buttons.

**The Edge Print Rule.** Metadata speaks in edge print: Archivo Narrow, uppercase, 0.09em tracking. Reading text never does.

## Layout

A centred sheet capped at 1480px, with 16px side margins on mobile and 32px from 640px. The top rail is a 48px bar with the product name left and library facts in edge print right (facts hidden below 640px). Below it the slate: brief field full width, then one wrapping row with the two filters left and the Develop action pushed right, then example briefs in three equal columns from 768px. Sections separate with a single hairline and 28-32px of space, not with panels.

The sheet is an ordered list of frames: two columns on mobile, three from 768px, five from 1280px. At 1280px the column gap collapses to zero so the five frames read as one continuous black film band; captions keep a 24px right pad instead. Blank frames past the visible count hide at each breakpoint so the empty sheet always fills its row. Vertical rhythm between frame rows is 40px.

## Elevation & Depth

Flat. There are no box shadows, gradients, or blurs. Depth is tonal (film black sits darker than the sheet; selects sit one step lighter) and physical: the loupe scales a frame to 1.6x on hover or focus from 768px and lifts it above its neighbours, with the frame's black border separating it from the sheet. The loupe grows inward at the strip's ends so it never leaves the page.

### Named Rules
**The No-Lift Rule.** Nothing floats. Separation comes from film black, hairlines, and scale, never from a cast shadow.

## Shapes

Square corners throughout (0px): frames, buttons, fields, the error box. Borders are 1px hairlines, with a 2px underline only for the brief field. The single curved, irregular form is the grease-pencil loop: a wobbly superellipse that starts at a different point per rank and overshoots where it closes, drawn in two passes (1.25 and 0.7 stroke, the second offset and at 70% opacity) through the `#wax` SVG filter (fractal-noise displacement plus a grain mask). Interface icons are small 1.5-stroke inline SVGs with round caps.

## Components

### Buttons
- **Shape:** square (0px), 44px tall, minimum 144px wide.
- **Primary:** pressed grease fill, white 15px semibold text, 24px side padding. Label names the action in the world's verb ("Develop sheet", "Developing…" while busy).
- **Hover / Focus:** fill shifts to grease red; focus is the global 2px grease outline at 3px offset.
- **Disabled:** dull warm-grey fill (#3a3a37) with grey text (#9a9a94), not-allowed cursor.

### Inputs / Fields
- **Brief field:** borderless transparent textarea with a 2px strong-hairline underline, display-size text, grows with content (minimum two lines). Focus turns the underline grease red; no outline box.
- **Select:** square, 44px, raised-sheet fill, 1px strong-hairline border, 14px text, inline chevron at the right. Hover lightens the border to dim proof.
- **Labels:** edge print above each field; the brief label is amber, filter labels are dim.

### Example briefs
Frame labels for the slate: a 1px hairline across the top, an amber edge-print label, then the brief in dim body text. Hover turns the rule and label full amber and the text to proof grey. Clicking fills the brief and develops immediately.

### Film frame (signature)
A black film border (10px) around a square image well, with edge print underneath: frame number left (01A, 02A…), days live right. Blank frames show a dark well, amber edge print at 70%, and a pulsing "Exposing" state while loading. Developed frames fade in from an overexposed grey over 900ms, staggered 260ms in rank order.

### Grease mark (signature)
After every frame has developed, a red loop draws around each in rank order (520ms each, 220ms apart), followed by the rank numeral written in at the top-left corner with a small tilt. The mark fades out while the loupe is open. Under reduced motion every frame, loop and numeral appears instantly.

### Pick caption
Brand as title, one-line reason in body, tags in dim edge print joined with middots, then "Open in Ad Library" as an underlined 13px link with an inline external-link glyph; the underline turns grease on hover.

## Do's and Don'ts

### Do:
- **Do** hold every ad in a black film frame with edge print beneath it.
- **Do** keep grease red for marks, focus, and the single primary action.
- **Do** set all metadata, labels and status lines in edge print (Archivo Narrow 600, 0.75rem, 0.09em, uppercase).
- **Do** draw hand marks as SVG paths through the `#wax` filter, in rank order, and make them instant under reduced motion.
- **Do** separate regions with hairlines (`rule`, `rule-strong`) and space, keeping corners square.
- **Do** label proxies as proxies in amber edge print beside the number they qualify.

### Don't:
- **Don't** use rounded cards, box shadows, or gradients.
- **Don't** introduce a second accent colour; amber and red are the only inks.
- **Don't** use Permanent Marker for anything but rank numerals.
- **Don't** fake the pencil with raster textures, emoji, or icon-font glyphs.
- **Don't** add a light theme; the sheet is dark only.
