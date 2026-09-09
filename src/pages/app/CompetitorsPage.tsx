import { Card, EmptyState, PageHeader } from "@/components/app/PageHeader";
import { errorMessage, relativeTime, useAppData } from "@/components/app/useAppData";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useAction } from "convex/react";
import { ExternalLink, Loader2, Radar, RefreshCw, Sparkles, Swords } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORY: Record<"direct" | "indirect" | "attention", { label: string; blurb: string }> = {
  direct: { label: "Direct competitors", blurb: "Same offer, same customers." },
  indirect: { label: "Indirect competitors", blurb: "Different offer, same customer's money." },
  attention: { label: "Attention competitors", blurb: "Competing for the same audience's attention." },
};

export default function CompetitorsPage() {
  const { business, usage } = useAppData();
  const analyzeCompetitors = useAction(api.ai.analyzeCompetitors);
  const [busy, setBusy] = useState(false);
  const analysis = business.competitorAnalysis;
  const generating = business.planStatus === "generating";

  const analyze = async () => {
    setBusy(true);
    try {
      await analyzeCompetitors({ businessId: business._id });
      toast.success("Competitor analysis updated");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const button = (
    <Button className="rounded-full" onClick={analyze} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : analysis ? <RefreshCw className="size-4" /> : <Radar className="size-4" />}
      {busy ? "Analyzing… up to a minute" : analysis ? "Re-analyze" : "Analyze competitors"}
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Competitors"
        description={`See who you're up against in ${business.location} and where the gaps are.${usage ? ` ${usage.limits.competitorInsights === "basic" ? "Basic" : "Advanced"} insights on ${usage.planName}.` : ""}`}
        actions={button}
      />

      {!analysis ? (
        <Card>
          <EmptyState
            icon={<Swords className="size-5" />}
            title={generating ? "Cloudy is researching your competitors…" : "No competitor analysis yet"}
            description={
              business.competitors?.length
                ? `You told us about ${business.competitors.join(", ")}. Cloudy will research them and find others competing for your customers.`
                : "Cloudy discovers direct, indirect and attention competitors in your area and turns their weaknesses into content ideas."
            }
            action={generating ? undefined : button}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card eyebrow="Summary" title="The landscape">
            <p className="text-sm leading-relaxed text-ink md:text-base">{analysis.summary}</p>
            <p className="mt-3 text-[11px] text-secondary-text">
              Updated {relativeTime(analysis.generatedAt)}{analysis.status === "fallback" && " · estimated from your profile — re-analyze for live research"}
            </p>
          </Card>

          {(["direct", "indirect", "attention"] as const).map((cat) => {
            const list = analysis.competitors.filter((c) => c.category === cat).sort((a, b) => b.relevanceScore - a.relevanceScore);
            if (!list.length) return null;
            return (
              <Card key={cat} eyebrow={CATEGORY[cat].blurb} title={CATEGORY[cat].label}>
                <div className="grid gap-3 md:grid-cols-2">
                  {list.map((c) => (
                    <div key={c.name} className="rounded-2xl border border-hairline bg-white p-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-serif text-lg font-medium leading-tight text-ink">{c.name}</p>
                          {c.location && <p className="text-xs text-secondary-text">{c.location}</p>}
                        </div>
                        <span className="shrink-0 rounded-full bg-sage px-2 py-0.5 text-[11px] font-semibold text-forest-700">{Math.round(c.relevanceScore)}% match</span>
                      </div>
                      {c.positioning && <p className="mt-2 leading-relaxed text-secondary-text">{c.positioning}</p>}
                      {c.services && <p className="mt-1 text-xs text-secondary-text"><span className="font-semibold">Offer:</span> {c.services}</p>}
                      {c.contentTypes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.contentTypes.map((t) => <span key={t} className="rounded-md bg-cream px-1.5 py-0.5 text-[11px] text-forest-700">{t}</span>)}
                        </div>
                      )}
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Pros label="Strengths" items={c.strengths} />
                        <Pros label="Weaknesses" items={c.weaknesses} accent />
                      </div>
                      {c.website && (
                        <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
                          Visit <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}

          {analysis.opportunities.length > 0 && (
            <Card eyebrow="Gaps & opportunities" title="Where you can win">
              <div className="grid gap-3 md:grid-cols-2">
                {analysis.opportunities.map((o) => (
                  <div key={o.gap} className="rounded-2xl border border-hairline bg-white p-4 text-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">Gap</p>
                    <p className="font-medium text-ink">{o.gap}</p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-secondary-text">Opportunity</p>
                    <p className="text-ink">{o.opportunity}</p>
                    <p className="mt-3 rounded-xl bg-sage p-3 text-forest-800"><Sparkles className="mr-1 inline size-3.5" />{o.contentIdea}</p>
                    <p className="mt-2 text-xs leading-relaxed text-secondary-text">{o.why}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function Pros({ label, items, accent }: { label: string; items: string[]; accent?: boolean }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={cn("text-[10px] font-semibold uppercase tracking-wider", accent ? "text-forest-700" : "text-secondary-text")}>{label}</p>
      <ul className="mt-1 space-y-0.5 text-xs leading-relaxed text-ink">
        {items.slice(0, 3).map((i) => <li key={i}>· {i}</li>)}
      </ul>
    </div>
  );
}
