"use client";

import { useId, useState } from "react";
import type { SearchResult, SearchStats } from "@/lib/search";
import { FORMATS, LANGUAGES } from "@/lib/taxonomy";

const EXAMPLES = [
  { label: "Supplement · problem hook", brief: "Static for a magnesium supplement, problem-first hook about bad sleep, Dutch, no person in the image." },
  { label: "Skincare · social proof", brief: "Skincare serum, social proof with a customer review front and centre, clean product shot." },
  { label: "Snack · bundle offer", brief: "Snack brand running a bundle deal, bold offer headline, lots of colour." },
];

const FRAME_COUNT = 5;
const STAGGER_MS = 260;

/**
 * A hand-drawn grease-pencil loop around a frame: a squarish oval (superellipse)
 * with wobble, started at a different point per rank, that overshoots where it
 * closes. Deterministic per seed so server and client render the same path.
 */
function loopPath(seed: number): string {
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const exponent = 5.5;
  const start = -2.4 + rand() * 0.7;
  const sweep = Math.PI * 2 + 0.5 + rand() * 0.25;
  const phase = rand() * 6;
  const steps = 96;
  const shape = (v: number) => Math.sign(v) * Math.abs(v) ** (2 / exponent);
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = start + (sweep * i) / steps;
    // Wobble plus a slow inward drift, so the overshoot runs alongside the start
    // instead of retracing it.
    const r = 1.01 + 0.018 * Math.sin(3 * t + phase) + 0.01 * Math.sin(7 * t + phase * 2) - 0.035 * (i / steps);
    const x = 50 + 48.5 * r * shape(Math.cos(t));
    const y = 50 + 48.5 * r * shape(Math.sin(t));
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(" ");
}

const LOOPS = Array.from({ length: FRAME_COUNT }, (_, i) => loopPath(i + 3));

const words = (value: string) => value.replaceAll("_", " ");

type Status = "idle" | "loading" | "done" | "error";

export default function Home() {
  const briefId = useId();
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState("");
  const [language, setLanguage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [error, setError] = useState("");
  const [run, setRun] = useState(0);

  async function develop(text = brief) {
    if (!text.trim() || status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief: text, format: format || undefined, language: language || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Search failed (${res.status})`);
      setResults(body.results);
      setStats(body.stats);
      setRun((n) => n + 1);
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <WaxFilter />
      <header className="border-b border-rule">
        <div className="mx-auto flex h-12 w-full max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-8">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Reference search</h1>
          <p className="edge-print hidden text-proof-dim sm:block">Static ads · Meta Ad Library · picked by concept, not keyword</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 pb-16 sm:px-8">
        <form
          className="border-b border-rule py-8"
          onSubmit={(e) => {
            e.preventDefault();
            develop();
          }}
        >
          <label htmlFor={briefId} className="edge-print text-edge">
            Brief
          </label>
          <textarea
            id={briefId}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) develop();
            }}
            rows={2}
            placeholder="Static for a protein bar, comparison hook against sugary snacks, Dutch, product as the hero"
            className="mt-2 block min-h-[2lh] w-full resize-none border-0 border-b-2 border-rule-strong bg-transparent pb-3 text-[clamp(1.25rem,2.1vw,1.75rem)] leading-snug tracking-[-0.015em] text-proof outline-none [field-sizing:content] placeholder:text-[#8d8d88] focus:border-grease focus-visible:outline-none"
          />

          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-4">
            <Filter label="Format" value={format} onChange={setFormat} options={FORMATS} anyLabel="Any format" />
            <Filter label="Language" value={language} onChange={setLanguage} options={LANGUAGES} anyLabel="Any language" />
            <div className="ml-auto flex items-center gap-4">
              <span className="edge-print hidden text-proof-dim md:inline">Ctrl + Enter</span>
              <button
                type="submit"
                disabled={!brief.trim() || status === "loading"}
                aria-busy={status === "loading"}
                className="h-11 min-w-36 bg-grease-press px-6 text-[15px] font-semibold text-white transition-colors hover:bg-grease disabled:cursor-not-allowed disabled:bg-[#3a3a37] disabled:text-[#9a9a94]"
              >
                {status === "loading" ? "Developing…" : "Develop sheet"}
              </button>
            </div>
          </div>

          <p className="edge-print mt-8 text-proof-dim">Try an example</p>
          <div className="mt-3 grid gap-x-5 gap-y-4 md:grid-cols-3">
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => {
                  setBrief(example.brief);
                  develop(example.brief);
                }}
                className="group/example flex flex-col justify-start border-t border-rule pt-3 text-left transition-colors hover:border-edge"
              >
                <span className="edge-print block text-edge/80 group-hover/example:text-edge">{example.label}</span>
                <span className="mt-1.5 block text-[14px] leading-snug text-proof-dim group-hover/example:text-proof">{example.brief}</span>
              </button>
            ))}
          </div>
        </form>

        <section aria-labelledby="sheet-heading" aria-busy={status === "loading"} className="pt-7">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="sheet-heading" className="text-[15px] font-semibold">
              {status === "done" ? "Picks" : "Contact sheet"}
            </h2>
            <SheetMeta status={status} stats={stats} count={results.length} />
          </div>

          {status === "error" && (
            <p role="alert" className="mb-6 border border-grease/60 px-4 py-3 text-[14px] text-proof">
              <span className="font-semibold text-grease">Search failed.</span> {error} Check the brief and try again.
            </p>
          )}

          {status === "done" && results.length === 0 ? (
            <p className="max-w-[60ch] text-[15px] text-proof-dim">
              No ads match that format and language together. Set one filter back to “any” and develop again.
            </p>
          ) : (
            // At xl the five frames share one continuous black film band.
            <ol className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-5 xl:gap-x-0">
              {status === "done"
                ? results.map((r, i) => <Frame key={`${run}-${r.id}`} result={r} index={i} total={results.length} />)
                : Array.from({ length: FRAME_COUNT }, (_, i) => <BlankFrame key={i} index={i} exposing={status === "loading"} />)}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}

/** Wax texture for the grease-pencil marks: roughened edges and grain gaps. */
function WaxFilter() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <filter id="wax" x="-10%" y="-10%" width="120%" height="120%" filterUnits="objectBoundingBox">
        <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.9" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.05" result="grain" />
        <feComposite in="rough" in2="grain" operator="in" />
      </filter>
    </svg>
  );
}

function Filter(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  anyLabel: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="edge-print text-proof-dim">
        {props.label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className="h-11 min-w-44 appearance-none border border-rule-strong bg-sheet-raised pl-3 pr-10 text-[14px] text-proof hover:border-proof-dim"
        >
          <option value="">{props.anyLabel}</option>
          {props.options.map((o) => (
            <option key={o} value={o}>
              {words(o)}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-proof-dim"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function SheetMeta({ status, stats, count }: { status: Status; stats: SearchStats | null; count: number }) {
  if (status === "loading") return <p className="edge-print text-edge" role="status">Exposing · ranking 20 candidates</p>;
  if (status === "done" && stats) {
    return (
      <p className="edge-print text-proof-dim" role="status">
        {count} picks · {(stats.ms / 1000).toFixed(1)} s · {(stats.inputTokens + stats.outputTokens).toLocaleString("en")} tokens ·{" "}
        <span className="text-edge">days live is a rough proxy, not performance</span>
      </p>
    );
  }
  return <p className="edge-print text-proof-dim">Five frames · circled in rank order</p>;
}

function frameNumber(index: number) {
  return `${String(index + 1).padStart(2, "0")}A`;
}

const BLANK_LABELS = ["Best match", "Pick 2", "Pick 3", "Pick 4", "Pick 5"];

function BlankFrame({ index, exposing }: { index: number; exposing: boolean }) {
  return (
    <li className={index === 4 ? "hidden xl:block" : index === 3 ? "hidden md:block" : undefined}>
      <div className="bg-film p-2.5">
        <div className={`aspect-square bg-[#1a1a1a] ${exposing ? "frame-exposing" : ""}`} style={{ animationDelay: `${index * 120}ms` }} />
        <p className="edge-print mt-2 flex justify-between gap-2 text-edge/70">
          <span>{frameNumber(index)}</span>
          <span>{exposing ? "Exposing" : BLANK_LABELS[index]}</span>
        </p>
      </div>
      <p className="mt-4 text-[13px] leading-snug text-[#8d8d88] xl:pr-6">
        {index === 0 ? (exposing ? "Matching your brief…" : "Write a brief and develop the sheet. The best five ads land here, circled, with the reason each fits.") : " "}
      </p>
    </li>
  );
}

function Frame({ result: r, index, total }: { result: SearchResult; index: number; total: number }) {
  const delay = index * STAGGER_MS;
  const markDelay = total * STAGGER_MS + 200 + index * 220;
  // Loupe grows inward so edge columns never spill off the page.
  const origin = index === 0 ? "origin-left" : index === total - 1 ? "origin-right" : "origin-center";
  const tags = [r.hook_type, r.format, r.offer !== "none" ? r.offer : null, r.language].filter(Boolean) as string[];

  return (
    <li className="group relative hover:z-30 focus-within:z-30">
      <figure>
        <div className="relative">
          {/* Loupe: the whole film frame enlarges, so its black border separates it from the sheet. */}
          <div
            className={`loupe relative transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:group-hover:scale-[1.6] md:group-focus-within:scale-[1.6] ${origin}`}
          >
            <div className="frame-develop bg-film p-2.5" style={{ animationDelay: `${delay}ms` }}>
              <div className="aspect-square bg-[#0b0b0b]">
                {/* eslint-disable-next-line @next/next/no-img-element -- local static ad files */}
                <img
                  src={r.image_url}
                  alt={r.headline_text ? `${r.brand} ad: “${r.headline_text}”` : `${r.brand} ad: ${r.angle}`}
                  loading={index < 3 ? "eager" : "lazy"}
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="edge-print mt-2 flex justify-between gap-2 text-edge xl:px-2" title={r.id}>
                <span>{frameNumber(index)}</span>
                {r.days_running != null && <span className="truncate">{r.days_running} days live</span>}
              </p>
            </div>
          </div>

          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute -inset-3 z-10 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] overflow-visible transition-opacity xl:-inset-x-0.5 xl:-inset-y-5 xl:h-[calc(100%+2.5rem)] xl:w-[calc(100%+0.25rem)] md:group-focus-within:opacity-0 md:group-hover:opacity-0"
          >
            <g filter="url(#wax)" fill="none" stroke="var(--grease)" strokeLinecap="round" strokeLinejoin="round">
              <path
                d={LOOPS[index % LOOPS.length]}
                pathLength={1}
                strokeWidth={1.25}
                className="grease-circle"
                style={{ animationDelay: `${markDelay}ms` }}
              />
              {/* Second, thinner pass offset slightly: uneven pressure, the way wax builds up. */}
              <path
                d={LOOPS[index % LOOPS.length]}
                pathLength={1}
                strokeWidth={0.7}
                strokeOpacity={0.7}
                transform="translate(0.6 0.4)"
                className="grease-circle"
                style={{ animationDelay: `${markDelay + 40}ms` }}
              />
            </g>
          </svg>
          <span
            aria-hidden="true"
            className="grease-rank absolute -left-3 -top-7 z-20 font-marker text-[40px] leading-none text-grease [text-shadow:0_1px_0_#141414]"
            style={{ animationDelay: `${markDelay + 380}ms` }}
          >
            {index + 1}
          </span>
        </div>

        <figcaption className="mt-5 flex flex-col gap-2 xl:pr-6">
          <h3 className="text-[16px] font-semibold leading-tight tracking-[-0.01em]">
            <span className="sr-only">Pick {index + 1}: </span>
            {r.brand}
          </h3>
          <p className="text-[14px] leading-[1.45] text-proof">{r.reason}</p>
          <p className="edge-print text-proof-dim">{tags.map(words).join(" · ")}</p>
          {r.ad_library_url && (
            <a
              href={r.ad_library_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex w-fit items-center gap-1.5 text-[13px] text-proof underline decoration-rule-strong underline-offset-4 hover:decoration-grease"
            >
              Open in Ad Library
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </figcaption>
      </figure>
    </li>
  );
}
