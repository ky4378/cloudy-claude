import { PostDetailSheet } from "@/components/app/PostDetailSheet";
import { StatusBadge } from "@/components/app/StatusBadge";
import { EmptyState, PageHeader } from "@/components/app/PageHeader";
import { errorMessage, shortDate, useAppData, type Post } from "@/components/app/useAppData";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { CONTENT_TYPE_META, todayString, type ContentType } from "@/convex/lib/strategy";
import { cn } from "@/lib/utils";
import { useAction } from "convex/react";
import { CalendarDays, List, Loader2, Lock, RefreshCw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const TYPE_FILTERS: ("All" | ContentType)[] = ["All", "Reel", "Carousel", "Photo Post", "Story Post"];
const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "planned", label: "Ready" },
  { id: "done", label: "Posted" },
  { id: "skipped", label: "Skipped" },
];

const DOT: Record<string, string> = {
  planned: "bg-forest-300",
  done: "bg-ink",
  skipped: "bg-hairline",
};

export default function PlanPage() {
  const { business, posts, usage } = useAppData();
  const regenerateCalendar = useAction(api.plan.regenerateCalendar);
  const regenerateDays = useAction(api.plan.regenerateDays);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]>("All");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Post | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const today = todayString();
  const filtered = useMemo(
    () => posts.filter((p) => (type === "All" || p.contentType === type) && (status === "all" || p.status === status)),
    [posts, type, status],
  );
  const filteredIds = useMemo(() => new Set(filtered.map((p) => p._id)), [filtered]);

  const weeks = useMemo(() => {
    const out: Post[][] = [];
    for (let i = 0; i < posts.length; i += 7) out.push(posts.slice(i, i + 7));
    return out;
  }, [posts]);

  const leading = posts.length ? new Date(`${posts[0].date}T00:00:00`).getDay() : 0;
  const monthLabel = posts.length
    ? `${new Date(`${posts[0].date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${new Date(`${posts[posts.length - 1].date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
    : "";
  const canWeek = usage?.limits.regeneration === "week";

  const newPlan = async () => {
    setConfirm(false);
    setBusy("plan");
    try {
      await regenerateCalendar({ businessId: business._id });
      toast.success("Your new 30-day plan is ready.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const regenWeek = async (week: Post[]) => {
    if (!week.length) return;
    setBusy(`week-${week[0].dayIndex}`);
    try {
      await regenerateDays({ businessId: business._id, fromDayIndex: week[0].dayIndex, count: week.length });
      toast.success("Week regenerated.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="30-Day Plan"
        description={monthLabel ? `${monthLabel} · click any day for the full instructions.` : "Your month, day by day."}
        actions={
          <>
            <div className="glass-chip flex p-1">
              {(["calendar", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize", view === v ? "bg-primary text-primary-foreground" : "text-secondary-text")}
                >
                  {v === "calendar" ? <CalendarDays className="size-3.5" /> : <List className="size-3.5" />}
                  {v}
                </button>
              ))}
            </div>
            <Button className="rounded-full" onClick={() => setConfirm(true)} disabled={busy !== null || business.planStatus === "generating"}>
              {busy === "plan" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              New 30-day plan
            </Button>
          </>
        }
      />

      {posts.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-5" />} title="No plan yet" description="Generate your plan to fill this calendar." />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {TYPE_FILTERS.map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", type === t ? "bg-ink text-white" : "border border-hairline bg-white text-secondary-text hover:border-forest-300")}>
                {t === "All" ? "All formats" : `${CONTENT_TYPE_META[t].emoji} ${CONTENT_TYPE_META[t].label}`}
              </button>
            ))}
            <span className="mx-1 hidden h-5 w-px bg-hairline sm:block" />
            {STATUS_FILTERS.map((s) => (
              <button key={s.id} type="button" onClick={() => setStatus(s.id)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", status === s.id ? "bg-ink text-white" : "border border-hairline bg-white text-secondary-text hover:border-forest-300")}>
                {s.label}
              </button>
            ))}
          </div>

          {view === "calendar" ? (
            <div className="card-surface p-4 md:p-6">
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-secondary-text md:gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1 md:gap-2">
                {Array.from({ length: leading }).map((_, i) => <span key={`pad-${i}`} />)}
                {posts.map((p) => {
                  const dimmed = !filteredIds.has(p._id);
                  const isToday = p.date === today;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => setSelected(p)}
                      className={cn(
                        "flex min-h-20 flex-col rounded-xl border p-1.5 text-left transition-colors md:min-h-28 md:p-2.5",
                        isToday ? "border-forest-600 bg-sage/60" : "border-hairline bg-white hover:border-forest-300",
                        dimmed && "opacity-30",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("text-xs font-semibold", isToday ? "text-forest-700" : "text-secondary-text")}>{new Date(`${p.date}T00:00:00`).getDate()}</span>
                        <span className={cn("size-1.5 rounded-full", DOT[p.status] ?? DOT.planned)} />
                      </div>
                      <span className="mt-1 text-base leading-none">{CONTENT_TYPE_META[p.contentType].emoji}</span>
                      <span className="mt-1 hidden text-[11px] leading-snug text-ink line-clamp-3 md:block">{p.title}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-secondary-text">
                <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-forest-300" />Ready</span>
                <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-ink" />Posted</span>
                <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-hairline" />Skipped</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {weeks.map((week, wi) => {
                const rows = week.filter((p) => filteredIds.has(p._id));
                if (!rows.length) return null;
                const id = `week-${week[0].dayIndex}`;
                return (
                  <section key={id} className="card-surface overflow-hidden">
                    <header className="flex items-center justify-between border-b border-hairline px-5 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-secondary-text">
                        Week {wi + 1} · {shortDate(week[0].date)} – {shortDate(week[week.length - 1].date)}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-full text-xs text-forest-700"
                        disabled={!canWeek || busy !== null}
                        title={canWeek ? "Regenerate this week" : "Available on Pro"}
                        onClick={() => regenWeek(week)}
                      >
                        {busy === id ? <Loader2 className="size-3.5 animate-spin" /> : canWeek ? <RefreshCw className="size-3.5" /> : <Lock className="size-3.5" />}
                        Regenerate week{!canWeek && <span className="ml-1 text-secondary-text">· Pro</span>}
                      </Button>
                    </header>
                    <ul className="divide-y divide-hairline">
                      {rows.map((p) => (
                        <li key={p._id}>
                          <button type="button" onClick={() => setSelected(p)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-paper/70">
                            <div className="w-20 shrink-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">Day {p.dayIndex + 1}</p>
                              <p className={cn("text-sm font-medium", p.date === today ? "text-forest-700" : "text-ink")}>{shortDate(p.date)}</p>
                            </div>
                            <span className="text-lg">{CONTENT_TYPE_META[p.contentType].emoji}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                              <p className="truncate text-xs text-secondary-text">{CONTENT_TYPE_META[p.contentType].label} · {p.goal}{p.time ? ` · ${p.time}` : ""}</p>
                            </div>
                            <StatusBadge status={p.status} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <PostDetailSheet post={selected ? posts.find((p) => p._id === selected._id) ?? selected : null} open={selected !== null} onOpenChange={(o) => !o && setSelected(null)} />

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-medium">Generate a new 30-day plan?</DialogTitle>
            <DialogDescription>
              This replaces your current plan with a fresh month starting today, written from your latest profile and strategy.
              {usage?.hasSubscription && ` It uses 1 of your ${usage.plans.limit} plans this month (${usage.plans.remaining} left).`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button className="rounded-full" onClick={newPlan}>Generate new plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
