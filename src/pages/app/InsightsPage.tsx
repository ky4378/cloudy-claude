import { Card, EmptyState, PageHeader } from "@/components/app/PageHeader";
import { errorMessage, relativeTime, useAppData } from "@/components/app/useAppData";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useAction } from "convex/react";
import { Compass, Lightbulb, Loader2, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PRIORITY_CLASS: Record<string, string> = {
  high: "bg-primary text-primary-foreground",
  medium: "bg-sage text-forest-700",
  low: "bg-cream text-secondary-text",
};

const MOMENTUM_CLASS: Record<string, string> = {
  rising: "bg-sage text-forest-700",
  peaking: "bg-primary text-primary-foreground",
  steady: "bg-cream text-secondary-text",
};

function Meta({ generatedAt, source }: { generatedAt: number; source: string }) {
  return (
    <p className="text-[11px] text-secondary-text">
      Updated {relativeTime(generatedAt)} · {source === "ai" ? "AI" : "Cloudy engine"}
    </p>
  );
}

function useRun() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
      toast.success(success);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

export default function InsightsPage() {
  const { business, usage } = useAppData();
  const generateMarketingStrategy = useAction(api.ai.generateMarketingStrategy);
  const analyzeTrends = useAction(api.ai.analyzeTrends);
  const generateRecommendations = useAction(api.ai.generateRecommendations);
  const { busy, run } = useRun();
  const generating = business.planStatus === "generating";

  const strategy = business.strategy;
  const trends = business.trendReport;
  const recs = business.recommendations;
  const sortedRecs = recs ? [...recs.items].sort((a, b) => ["high", "medium", "low"].indexOf(a.priority) - ["high", "medium", "low"].indexOf(b.priority)) : [];

  const actionButton = (key: string, label: string, fn: () => Promise<unknown>, success: string, has: boolean) => (
    <Button size="sm" variant={has ? "ghost" : "default"} className={cn("rounded-full", has && "text-forest-700")} disabled={busy !== null || generating} onClick={() => run(key, fn, success)}>
      {busy === key ? <Loader2 className="size-4 animate-spin" /> : has ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}
      {label}
    </Button>
  );

  return (
    <>
      <PageHeader title="Insights" description="Your strategy, the trends worth using and what to do next — all written for your business." />

      <div className="space-y-6">
        <Card eyebrow="Marketing strategy" title={strategy?.monthlyTheme ?? "Recommended strategy"} actions={actionButton("strategy", strategy ? "Refresh strategy" : "Generate strategy", () => generateMarketingStrategy({ businessId: business._id }), "Strategy updated", Boolean(strategy))}>
          {strategy ? (
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4 text-sm">
                <p className="text-base leading-relaxed text-ink">{strategy.summary}</p>
                <div className="rounded-2xl bg-paper p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">Positioning</p>
                  <p className="mt-1 text-ink">{strategy.positioning}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Fact label="Focus" value={strategy.focus} />
                  <Fact label="Cadence" value={strategy.postingCadence} />
                  <Fact label="Best times" value={strategy.bestTimes.join(" · ")} />
                </div>
                <Meta generatedAt={strategy.generatedAt} source={strategy.source} />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">Content pillars</p>
                  <div className="mt-2 space-y-3">
                    {strategy.pillars.map((p) => (
                      <div key={p.name}>
                        <div className="flex items-center justify-between text-sm"><span className="font-medium text-ink">{p.name}</span><span className="text-xs text-secondary-text">{p.share}%</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-cream"><div className="h-1.5 rounded-full bg-forest-600" style={{ width: `${p.share}%` }} /></div>
                        <p className="mt-1 text-xs leading-relaxed text-secondary-text">{p.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">Key opportunities</p>
                <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {strategy.opportunities.map((o) => (
                    <div key={o.title} className="rounded-2xl border border-hairline bg-white p-4 text-sm">
                      <p className="font-serif text-lg font-medium leading-tight text-ink">{o.title}</p>
                      <p className="mt-2 leading-relaxed text-secondary-text">{o.why}</p>
                      <p className="mt-3 rounded-xl bg-sage p-3 text-forest-800"><span className="font-semibold">Try:</span> {o.contentIdea}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon={<Compass className="size-5" />} title={generating ? "Writing your strategy…" : "No strategy yet"} description="Cloudy writes a recommended strategy from your questionnaire answers." />
          )}
        </Card>

        <Card eyebrow="Trends" title="Trends to use this month" actions={actionButton("trends", trends ? "Re-analyze" : "Analyze trends", () => analyzeTrends({ businessId: business._id }), "Trends analyzed", Boolean(trends))}>
          {trends ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {trends.trends.map((t) => (
                  <div key={t.title} className="rounded-2xl border border-hairline bg-white p-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", MOMENTUM_CLASS[t.momentum])}>{t.momentum}</span>
                      <span className="text-[11px] text-secondary-text">{t.format}</span>
                    </div>
                    <p className="mt-2 font-serif text-lg font-medium leading-tight text-ink">{t.title}</p>
                    <p className="mt-1 leading-relaxed text-secondary-text">{t.description}</p>
                    <p className="mt-2 text-ink"><span className="font-semibold">How to use it:</span> {t.howToUse}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Meta generatedAt={trends.generatedAt} source={trends.source} />
                {usage && <p className="text-[11px] capitalize text-secondary-text">{usage.limits.trendInsights} insights · {usage.planName}</p>}
              </div>
            </>
          ) : (
            <EmptyState icon={<TrendingUp className="size-5" />} title={generating ? "Analyzing trends…" : "No trend report yet"} description="Find the formats and topics working right now for businesses like yours." />
          )}
        </Card>

        <Card eyebrow="Recommendations" title="What to do next" actions={actionButton("recs", recs ? "Refresh" : "Get recommendations", () => generateRecommendations({ businessId: business._id }), "Recommendations updated", Boolean(recs))}>
          {recs ? (
            <>
              <ul className="space-y-3">
                {sortedRecs.map((r) => (
                  <li key={r.title} className="flex gap-4 rounded-2xl border border-hairline bg-white p-4 text-sm">
                    <span className={cn("mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", PRIORITY_CLASS[r.priority])}>{r.priority}</span>
                    <div>
                      <p className="font-medium text-ink">{r.title}</p>
                      <p className="mt-1 leading-relaxed text-secondary-text">{r.detail}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-secondary-text">{r.category}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3"><Meta generatedAt={recs.generatedAt} source={recs.source} /></div>
            </>
          ) : (
            <EmptyState icon={<Lightbulb className="size-5" />} title={generating ? "Preparing recommendations…" : "No recommendations yet"} description="Prioritized, practical next steps based on your goals and progress." />
          )}
        </Card>
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}
