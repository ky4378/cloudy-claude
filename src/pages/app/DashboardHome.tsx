import { PostDetailSheet } from "@/components/app/PostDetailSheet";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card, EmptyState, PageHeader } from "@/components/app/PageHeader";
import { errorMessage, shortDate, useAppData, type Post } from "@/components/app/useAppData";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { BUSINESS_TYPES, CONTENT_TYPE_META, todayString } from "@/convex/lib/strategy";
import { useAction, useMutation } from "convex/react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Flame,
  Lightbulb,
  Loader2,
  Lock,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);

export default function DashboardHome() {
  const { business, posts, usage } = useAppData();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Post | null>(null);
  const updateStatus = useMutation(api.businesses.updatePostStatus);
  const analyzeTrends = useAction(api.ai.analyzeTrends);
  const [trendBusy, setTrendBusy] = useState(false);

  const today = todayString();
  const todayPost = posts.find((p) => p.date === today) ?? posts.find((p) => p.date > today) ?? null;
  const week = posts.filter((p) => p.date >= today).slice(0, 7);
  const kb = BUSINESS_TYPES.find((b) => b.id === business.businessType);

  const stats = useMemo(() => {
    const start = business.planStartDate ?? today;
    const elapsed = Math.max(0, Math.min(posts.length, daysBetween(start, today) + 1));
    const done = posts.filter((p) => p.status === "done").length;
    const expected = Math.max(1, elapsed);
    const consistency = Math.min(100, Math.round((done / expected) * 100));
    let streak = 0;
    const byDate = new Map(posts.map((p) => [p.date, p]));
    for (let i = 0; i <= 30; i++) {
      const d = new Date(`${today}T00:00:00`);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const p = byDate.get(iso);
      if (p?.status === "done") streak++;
      else if (i > 0) break;
    }
    const mix: Record<string, number> = {};
    for (const p of posts) mix[p.contentType] = (mix[p.contentType] ?? 0) + 1;
    const daysLeft = Math.max(0, posts.length - elapsed);
    return { elapsed, done, consistency, streak, mix, daysLeft };
  }, [posts, business.planStartDate, today]);

  const strategy = business.strategy;
  const opportunity = strategy?.opportunities[0];
  const trend = business.trendReport?.trends[0];
  const welcome = params.get("welcome") === "1";

  const markPosted = async (post: Post) => {
    try {
      await updateStatus({ postId: post._id, status: post.status === "done" ? "planned" : "done" });
      toast.success(post.status === "done" ? "Marked as ready" : "Marked as posted");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${business.businessName}`}
        description="Here's what Cloudy recommends for you."
      />

      {welcome && (
        <div className="mb-8 rounded-[1.75rem] bg-primary p-7 text-paper md:p-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Welcome to Cloudy</p>
              <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">Your plan is ready.</h2>
              {strategy && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">{strategy.summary}</p>}
              <div className="mt-6 flex flex-wrap gap-2">
                <Button asChild className="rounded-full bg-paper text-forest-700 hover:bg-white">
                  <Link to="/dashboard/plan">View 30-day plan <ArrowRight className="size-4" /></Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-full text-paper hover:bg-white/10 hover:text-paper">
                  <Link to="/dashboard/insights">See strategy</Link>
                </Button>
              </div>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => { params.delete("welcome"); setParams(params, { replace: true }); }}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* Today's content */}
        <Card eyebrow="Today's content" title={todayPost ? shortDate(todayPost.date) : "Nothing scheduled"} className="md:col-span-2 xl:col-span-1">
          {todayPost ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sage px-2.5 py-1 text-[11px] font-semibold text-forest-700">
                  {CONTENT_TYPE_META[todayPost.contentType].emoji} {CONTENT_TYPE_META[todayPost.contentType].label}
                </span>
                <StatusBadge status={todayPost.status} />
                {todayPost.time && <span className="text-xs text-secondary-text">{todayPost.time}</span>}
              </div>
              <p className="mt-3 font-serif text-xl font-medium leading-tight text-ink">{todayPost.title}</p>
              <p className="mt-2 text-sm italic leading-relaxed text-secondary-text">“{todayPost.hook ?? todayPost.videoScript?.hook ?? todayPost.subject}”</p>
              <div className="mt-5 flex gap-2">
                <Button size="sm" className="rounded-full" onClick={() => markPosted(todayPost)}>
                  <Check className="size-4" /> {todayPost.status === "done" ? "Posted" : "Mark posted"}
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSelected(todayPost)}>
                  Open
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState title="No content for today" description="Your plan will show here once it's generated." />
          )}
        </Card>

        {/* This week */}
        <Card eyebrow="This week's plan" title="Next 7 days" actions={<Link to="/dashboard/plan" className="text-xs font-semibold text-forest-700 hover:underline">Full plan</Link>}>
          {week.length ? (
            <ul className="divide-y divide-hairline">
              {week.map((p) => (
                <li key={p._id}>
                  <button type="button" onClick={() => setSelected(p)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-paper/70">
                    <span className="w-16 shrink-0 text-xs font-medium text-secondary-text">{shortDate(p.date).replace(",", "")}</span>
                    <span className="text-base">{CONTENT_TYPE_META[p.contentType].emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.title}</span>
                    <StatusBadge status={p.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No upcoming posts" />
          )}
        </Card>

        {/* Growth opportunity */}
        <Card eyebrow="Growth opportunity" title={opportunity?.title ?? "Finding opportunities"}>
          {opportunity ? (
            <div className="space-y-3 text-sm">
              <p className="leading-relaxed text-secondary-text">{opportunity.why}</p>
              <div className="rounded-xl bg-sage p-3 text-forest-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider">Content idea</p>
                <p className="mt-1">{opportunity.contentIdea}</p>
              </div>
            </div>
          ) : (
            <EmptyState icon={<Lightbulb className="size-5" />} title="No strategy yet" description="Generate your plan to see opportunities." action={<Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/dashboard/insights">Insights</Link></Button>} />
          )}
        </Card>

        {/* Trend */}
        <Card eyebrow="Trend to use" title={trend?.title ?? "Trends"}>
          {trend ? (
            <div className="space-y-3 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[11px] font-semibold capitalize text-forest-700">
                <TrendingUp className="size-3" /> {trend.momentum} · {trend.format}
              </span>
              <p className="leading-relaxed text-secondary-text">{trend.description}</p>
              <p className="text-ink"><span className="font-semibold">How to use it:</span> {trend.howToUse}</p>
            </div>
          ) : business.planStatus === "generating" ? (
            <div className="flex items-center gap-2 text-sm text-secondary-text"><Loader2 className="size-4 animate-spin" /> Analyzing trends…</div>
          ) : (
            <EmptyState icon={<TrendingUp className="size-5" />} title="No trend report yet" action={
              <Button size="sm" className="rounded-full" disabled={trendBusy} onClick={async () => {
                setTrendBusy(true);
                try { await analyzeTrends({ businessId: business._id }); toast.success("Trends analyzed"); }
                catch (e) { toast.error(errorMessage(e)); } finally { setTrendBusy(false); }
              }}>{trendBusy ? <Loader2 className="size-4 animate-spin" /> : "Analyze trends"}</Button>
            } />
          )}
        </Card>

        {/* Consistency */}
        <Card eyebrow="Content consistency" title={`${stats.consistency}% on track`}>
          <div className="h-2 rounded-full bg-cream"><div className="h-2 rounded-full bg-forest-600 transition-all" style={{ width: `${stats.consistency}%` }} /></div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="Posted" value={stats.done} />
            <Stat label="Days in" value={stats.elapsed} />
            <Stat label="Streak" value={<span className="inline-flex items-center gap-1"><Flame className="size-4 text-forest-600" />{stats.streak}</span>} />
          </div>
        </Card>

        {/* Performance */}
        <Card eyebrow="Performance" title={usage?.limits.performanceInsights === false ? "Performance insights" : "Content mix"}>
          {usage?.limits.performanceInsights === false ? (
            <EmptyState icon={<Lock className="size-5" />} title="Available on Growth and Pro" description="Track what performs and let Cloudy tune your next month." action={<Button asChild size="sm" className="rounded-full"><Link to="/billing">Upgrade</Link></Button>} />
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.mix).map(([type, n]) => (
                <div key={type} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-secondary-text">{CONTENT_TYPE_META[type as keyof typeof CONTENT_TYPE_META]?.label ?? type}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-cream"><div className="h-1.5 rounded-full bg-forest-400" style={{ width: `${(n / Math.max(1, posts.length)) * 100}%` }} /></div>
                  <span className="w-6 text-right text-xs text-ink">{n}</span>
                </div>
              ))}
              <p className="pt-2 text-xs text-secondary-text"><BarChart3 className="mr-1 inline size-3.5" />{stats.daysLeft} days left in this plan · {stats.done} posted</p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card eyebrow="Business overview" title={business.businessName}>
          <dl className="space-y-3 text-sm">
            <Row k="Type" v={kb ? `${kb.emoji} ${kb.label}` : business.businessType} />
            <Row k="Location" v={business.location} />
            <Row k="Audience" v={business.targetCustomers} />
            <Row k="Main goal" v={business.mainGoal ?? business.goals[0]} />
            <Row k="Tone" v={business.tone ?? business.brandPersonality[0]} />
            {business.differentiator && <Row k="Different because" v={business.differentiator} />}
          </dl>
          <Button asChild variant="ghost" size="sm" className="mt-4 -ml-2 rounded-full text-forest-700"><Link to="/dashboard/settings">Edit profile</Link></Button>
        </Card>
        <Card eyebrow="Recommended strategy" title={strategy?.monthlyTheme ?? "Your marketing strategy"} actions={<Link to="/dashboard/insights" className="text-xs font-semibold text-forest-700 hover:underline">Details</Link>}>
          {strategy ? (
            <div className="space-y-5 text-sm">
              <p className="leading-relaxed text-ink">{strategy.summary}</p>
              <p className="rounded-xl bg-paper p-3 text-secondary-text"><span className="font-semibold text-ink">Positioning:</span> {strategy.positioning}</p>
              <div className="space-y-2">
                {strategy.pillars.map((p) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between text-xs"><span className="font-medium text-ink">{p.name}</span><span className="text-secondary-text">{p.share}%</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-cream"><div className="h-1.5 rounded-full bg-forest-600" style={{ width: `${p.share}%` }} /></div>
                  </div>
                ))}
              </div>
              {strategy.opportunities.length > 1 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">Key opportunities</p>
                  <ul className="mt-2 space-y-1.5">
                    {strategy.opportunities.map((o) => (
                      <li key={o.title} className="flex items-start gap-2 text-ink"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-forest-600" />{o.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={<CalendarDays className="size-5" />} title="Strategy not generated yet" description="Cloudy writes your strategy together with your first plan." />
          )}
        </Card>
      </div>

      <PostDetailSheet post={selected} open={selected !== null} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-paper p-3">
      <p className="font-serif text-2xl text-ink">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">{label}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex gap-4">
      <dt className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wider text-secondary-text">{k}</dt>
      <dd className="text-ink">{v || "—"}</dd>
    </div>
  );
}
