
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Radar,
  RefreshCw,
  Search,
  Swords,
  Target,
  TrendingUp,
} from "lucide-react";

type Analysis = NonNullable<Doc<"businesses">["competitorAnalysis"]>;

const CATEGORY_META: Record<
  "direct" | "indirect" | "attention",
  { label: string; blurb: string; dot: string; badge: string }
> = {
  direct: {
    label: "Direct competitors",
    blurb: "Same offer, same customers — they'd lose a sale to each other.",
    dot: "bg-forest-600",
    badge: "bg-forest-100 text-forest-800",
  },
  indirect: {
    label: "Indirect competitors",
    blurb: "Different offer, competing for the same customer's money.",
    dot: "bg-[#c9a227]",
    badge: "bg-[#f7f0d8] text-[#7a6118]",
  },
  attention: {
    label: "Attention competitors",
    blurb: "Competing for the same audience's attention.",
    dot: "bg-[#4a7a8c]",
    badge: "bg-[#e2eef2] text-[#2f5b6b]",
  },
};

const scoreColor = (s: number) =>
  s >= 80
    ? "text-forest-700 bg-forest-100"
    : s >= 60
      ? "text-[#7a6118] bg-[#f7f0d8]"
      : "text-[#6e6a60] bg-cream";

function CompetitorCard({
  c,
  accent,
}: {
  c: Analysis["competitors"][number];
  accent: string;
}) {
  const meta = CATEGORY_META[c.category];
  return (
    <div className="flex flex-col rounded-2xl border border-hairline bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{c.name}</p>
          {c.location && (
            <p className="mt-0.5 truncate text-xs text-[#8f8b83]">{c.location}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor(c.relevanceScore)}`}
          title="Competitor relevance score"
        >
          {c.relevanceScore}% match
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
          <span className={`size-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        {c.estimated && (
          <span
            className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-semibold text-[#6e6a60]"
            title="Profile-based estimate — Cloudy never guesses brand names."
          >
            Estimate
          </span>
        )}
        {c.followers && (
          <span className="glass-chip rounded-full px-2 py-0.5 text-[11px] font-medium text-[#6e6a60]">
            {c.followers} followers
          </span>
        )}
        {c.postingFrequency && (
          <span className="glass-chip rounded-full px-2 py-0.5 text-[11px] font-medium text-[#6e6a60]">
            posts {c.postingFrequency}
          </span>
        )}
        {c.pricing && (
          <span className="glass-chip rounded-full px-2 py-0.5 text-[11px] font-medium text-[#6e6a60]">
            {c.pricing}
          </span>
        )}
      </div>

      {c.contentTypes.length > 0 && (
        <p className="mt-2.5 text-xs leading-relaxed text-[#6e6a60]">
          <span className="font-semibold text-ink">Content:</span>{" "}
          {c.contentTypes.join(" · ")}
          {c.engagement ? ` · ${c.engagement} engagement` : ""}
        </p>
      )}
      {c.bestContent && (
        <p className="mt-1.5 text-xs leading-relaxed text-[#6e6a60]">
          <span className="font-semibold text-ink">Working for them:</span>{" "}
          {c.bestContent}
        </p>
      )}
      {c.offers && (
        <p className="mt-1.5 text-xs leading-relaxed text-[#6e6a60]">
          <span className="font-semibold text-ink">Offers:</span> {c.offers}
        </p>
      )}
      {c.positioning && (
        <p className="mt-1.5 text-xs leading-relaxed text-[#6e6a60]">
          <span className="font-semibold text-ink">Angle:</span> {c.positioning}
        </p>
      )}
      {c.targetAudience && (
        <p className="mt-1.5 text-xs leading-relaxed text-[#6e6a60]">
          <span className="font-semibold text-ink">Audience:</span>{" "}
          {c.targetAudience}
        </p>
      )}
      {c.whyCompetes && (
        <p className="mt-1.5 text-xs leading-relaxed text-[#6e6a60]">
          <span className="font-semibold text-ink">Why they compete:</span>{" "}
          {c.whyCompetes}
        </p>
      )}

      {(c.strengths.length > 0 || c.weaknesses.length > 0) && (
        <div className="mt-3 grid gap-2 border-t border-hairline pt-3 sm:grid-cols-2">
          {c.strengths.length > 0 && (
            <ul className="space-y-1">
              {c.strengths.slice(0, 3).map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-[#6e6a60]">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-forest-500" />
                  {s}
                </li>
              ))}
            </ul>
          )}
          {c.weaknesses.length > 0 && (
            <ul className="space-y-1">
              {c.weaknesses.slice(0, 3).map((w, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-[#6e6a60]">
                  <span className="mt-0.5 size-3.5 shrink-0 rounded-full bg-[#f0c9c9] text-center text-[9px] font-bold leading-[14px] text-[#8a3a3a]">
                    !
                  </span>
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {c.evidence && (
        <p className="mt-2.5 border-t border-hairline/60 pt-2 text-[11px] italic leading-relaxed text-[#a9a49a]">
          Evidence: {c.evidence}
        </p>
      )}

      {c.website && (
        <a
          href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-70"
          style={{ color: accent }}
        >
          Visit their site <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}

function GroupSection({
  category,
  list,
  accent,
}: {
  category: "direct" | "indirect" | "attention";
  list: Analysis["competitors"];
  accent: string;
}) {
  if (list.length === 0) return null;
  const meta = CATEGORY_META[category];
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`size-2 rounded-full ${meta.dot}`} />
        <h3 className="text-sm font-bold text-ink">{meta.label}</h3>
        <span className="glass-chip rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#6e6a60]">
          {list.length}
        </span>
        <p className="hidden text-xs text-[#8f8b83] sm:block">{meta.blurb}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((c) => (
          <CompetitorCard key={c.name} c={c} accent={accent} />
        ))}
      </div>
    </div>
  );
}

export function CompetitorTracker({
  analysis,
  accentColor,
  analyzing,
  onAnalyze,
}: {
  analysis?: Analysis;
  accentColor: string;
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  if (!analysis) {
    return (
      <div className="glass-panel flex flex-col items-start gap-4 rounded-3xl px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: accentColor }}
          >
            <Radar className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Competitor tracker</p>
            <p className="mt-0.5 max-w-md text-xs leading-relaxed text-[#6e6a60]">
              Cloudy finds the local businesses competing for your customers,
              scores how closely they match you, and surfaces the content gaps
              they&apos;re leaving open.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onAnalyze}
          disabled={analyzing}
          className="shrink-0 rounded-xl"
        >
          {analyzing ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Radar className="mr-2 size-4" />
          )}
          {analyzing ? "Analyzing…" : "Analyze my competitors"}
        </Button>
      </div>
    );
  }

  const direct = analysis.competitors.filter((c) => c.category === "direct");
  const indirect = analysis.competitors.filter((c) => c.category === "indirect");
  const attention = analysis.competitors.filter((c) => c.category === "attention");

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="glass-panel flex flex-col gap-4 rounded-3xl px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: accentColor }}
          >
            <Swords className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink">Competitor tracker</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  analysis.status === "done"
                    ? "bg-forest-100 text-forest-800"
                    : "bg-[#f7f0d8] text-[#7a6118]"
                }`}
              >
                {analysis.status === "done"
                  ? "Live research"
                  : "Based on your profile"}
              </span>
            </div>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#6e6a60]">
              {analysis.summary}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAnalyze}
          disabled={analyzing}
          className="shrink-0 rounded-xl"
        >
          {analyzing ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          {analyzing ? "Analyzing…" : "Re-analyze"}
        </Button>
      </div>

      {/* Groups */}
      <div className="flex flex-col gap-6">
        <GroupSection category="direct" list={direct} accent={accentColor} />
        <GroupSection category="indirect" list={indirect} accent={accentColor} />
        <GroupSection category="attention" list={attention} accent={accentColor} />
      </div>

      {/* Market gaps → opportunities */}
      {analysis.opportunities.length > 0 && (
        <div className="glass-panel rounded-3xl px-5 py-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-forest-600" />
            <h3 className="text-sm font-bold text-ink">
              Market gaps — your opportunity
            </h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#6e6a60]">
            What competitors are missing, and the content that fills the gap.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {analysis.opportunities.map((o, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 rounded-2xl border border-hairline bg-cream/50 p-4"
              >
                <p className="text-xs leading-relaxed text-[#8f8b83] line-through decoration-[#c9a9a9]/70">
                  {o.gap}
                </p>
                <p className="flex items-start gap-1.5 text-sm font-semibold leading-snug text-ink">
                  <ArrowRight
                    className="mt-0.5 size-4 shrink-0 text-forest-600"
                  />
                  {o.opportunity}
                </p>
                <p
                  className="rounded-xl px-3 py-2 text-xs font-medium leading-relaxed"
                  style={{
                    backgroundColor: `${accentColor}14`,
                    color: accentColor,
                  }}
                >
                  <Target className="mr-1 inline size-3.5" />
                  {o.contentIdea}
                </p>
                <p className="text-xs leading-relaxed text-[#6e6a60]">{o.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How we found them */}
      {analysis.searches.length > 0 && (
        <div className="flex flex-col gap-2 rounded-3xl border border-dashed border-hairline bg-cream/40 px-5 py-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#6e6a60]">
            <Search className="size-3.5" />
            How Cloudy found them
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.searches.map((q) => (
              <span
                key={q}
                className="glass-chip rounded-full px-2.5 py-1 text-[11px] font-medium text-[#6e6a60]"
              >
                “{q}”
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
