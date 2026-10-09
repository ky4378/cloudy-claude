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
import { CalendarDays, Check, List, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
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

function DayCheckbox({ checked, onToggle, className }: { checked: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? "Deselect day" : "Select day to regenerate"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
        checked ? "border-forest-600 bg-forest-600 text-white" : "border-hairline bg-white text-transparent hover:border-forest-400",
        className,
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </button>
  );
}

export default function PlanPage() {
  const { business, posts, usage } = useAppData();
  const regenerateCalendar = useAction(api.plan.regenerateCalendar);
  const regenerateSelectedDays = useAction(api.plan.regenerateSelectedDays);
  const navigate = useNavigate();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]>("All");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Post | null>(null);
  const [picked, setPicked] = useState<Set<number>>(() => new Set());
  const [confirmNextMonth, setConfirmNextMonth] = useState(false);
  const [busy, setBusy] = useState<null | "month" | "days">(null);

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
  const monthEnded = posts.length > 0 && today >= posts[posts.length - 1].date;
  const hasSubscription = usage?.hasSubscription ?? false;
  const quota = usage?.regenerations ?? null;
  const pickedCount = picked.size;
  const overQuota = quota !== null && pickedCount > quota.remaining;
  const generating = business.planStatus === "generating";

  const toggleDay = (dayIndex: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      return next;
    });
  const toggleWeek = (week: Post[]) =>
    setPicked((prev) => {
      const next = new Set(prev);
      const all = week.every((p) => next.has(p.dayIndex));
      for (const p of week) {
        if (all) next.delete(p.dayIndex);
        else next.add(p.dayIndex);
      }
      return next;
    });
  const clearPicked = () => setPicked(new Set());

  const regeneratePicked = async () => {
    if (!hasSubscription) {
      navigate("/dashboard/billing");
      return;
    }
    if (pickedCount === 0 || overQuota || busy) return;
    setBusy("days");
    try {
      await regenerateSelectedDays({ businessId: business._id, dayIndexes: [...picked] });
      toast.success(pickedCount === 1 ? "1 day regenerated." : `${pickedCount} days regenerated.`);
      clearPicked();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const startNextMonth = async () => {
    setConfirmNextMonth(false);
    if (!hasSubscription) {
      navigate("/dashboard/billing");
      return;
    }
    setBusy("month");
    try {
      await regenerateCalendar({ businessId: business._id });
      toast.success("Your new 30-day plan is ready.");
      clearPicked();
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
            {quota && posts.length > 0 && (
              <span className="glass-chip px-3 py-1.5 text-xs font-semibold text-secondary-text" title="Days you can regenerate this month">
                <span className="text-ink">{quota.remaining}</span> of {quota.limit} regenerate days left
              </span>
            )}
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
            {monthEnded && (
              <Button className="rounded-full" onClick={() => setConfirmNextMonth(true)} disabled={busy !== null || generating}>
                {busy === "month" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Start next month
              </Button>
            )}
          </>
        }
      />

      {posts.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-5" />} title="No plan yet" description="Generate your plan to fill this calendar." />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
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
          <p className="mb-5 text-xs text-secondary-text">
            Tick the days you'd like Cloudy to rewrite, then hit Regenerate. Each day uses one of your monthly regenerate days.
          </p>

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
                  const isPicked = picked.has(p.dayIndex);
                  return (
                    <div
                      key={p._id}
                      className={cn(
                        "relative flex min-h-20 flex-col rounded-xl border transition-colors md:min-h-28",
                        isPicked ? "border-forest-600 bg-sage/70 ring-2 ring-forest-600/25" : isToday ? "border-forest-600 bg-sage/60" : "border-hairline bg-white hover:border-forest-300",
                        dimmed && "opacity-30",
                      )}
                    >
                      <DayCheckbox checked={isPicked} onToggle={() => toggleDay(p.dayIndex)} className="absolute right-1 top-1 size-4 md:right-2 md:top-2 md:size-5" />
                      <button type="button" onClick={() => setSelected(p)} className="flex flex-1 flex-col p-1.5 text-left md:p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-xs font-semibold", isToday ? "text-forest-700" : "text-secondary-text")}>{new Date(`${p.date}T00:00:00`).getDate()}</span>
                          <span className={cn("size-1.5 rounded-full", DOT[p.status] ?? DOT.planned)} />
                        </div>
                        <span className="mt-1 text-base leading-none">{CONTENT_TYPE_META[p.contentType].emoji}</span>
                        <span className="mt-1 hidden text-[11px] leading-snug text-ink line-clamp-3 md:block">{p.title}</span>
                      </button>
                    </div>
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
                const weekPicked = week.every((p) => picked.has(p.dayIndex));
                return (
                  <section key={id} className="card-surface overflow-hidden">
                    <header className="flex items-center justify-between border-b border-hairline px-5 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-secondary-text">
                        Week {wi + 1} · {shortDate(week[0].date)} – {shortDate(week[week.length - 1].date)}
                      </p>
                      <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs text-forest-700" disabled={busy !== null} onClick={() => toggleWeek(week)}>
                        <Check className="size-3.5" />
                        {weekPicked ? "Deselect week" : "Select week"}
                      </Button>
                    </header>
                    <ul className="divide-y divide-hairline">
                      {rows.map((p) => {
                        const isPicked = picked.has(p.dayIndex);
                        return (
                          <li key={p._id} className={cn("flex items-center gap-3 pl-5", isPicked && "bg-sage/50")}>
                            <DayCheckbox checked={isPicked} onToggle={() => toggleDay(p.dayIndex)} />
                            <button type="button" onClick={() => setSelected(p)} className="flex min-w-0 flex-1 items-center gap-4 py-3.5 pr-5 text-left hover:bg-paper/70">
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
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      {pickedCount > 0 && (
        <div className="fixed inset-x-4 bottom-5 z-40 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-hairline bg-white p-4 shadow-[0_18px_44px_-20px_rgba(23,23,23,0.35)] sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              {pickedCount === 1 ? "1 day selected" : `${pickedCount} days selected`}
            </p>
            <p className="text-xs text-secondary-text">
              {quota
                ? overQuota
                  ? `Only ${quota.remaining} regenerate ${quota.remaining === 1 ? "day" : "days"} left this month — pick fewer or upgrade.`
                  : `${quota.remaining - pickedCount} of ${quota.limit} regenerate days will remain this month.`
                : "Choose a plan to regenerate days."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={clearPicked} disabled={busy !== null}>
              Clear
            </Button>
            {overQuota ? (
              <Button className="rounded-full" onClick={() => navigate("/dashboard/billing")}>
                Upgrade
              </Button>
            ) : (
              <Button className="rounded-full" onClick={regeneratePicked} disabled={busy !== null || generating}>
                {busy === "days" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Regenerate {pickedCount === 1 ? "1 day" : `${pickedCount} days`}
              </Button>
            )}
          </div>
        </div>
      )}

      <PostDetailSheet post={selected ? posts.find((p) => p._id === selected._id) ?? selected : null} open={selected !== null} onOpenChange={(o) => !o && setSelected(null)} />

      <Dialog open={confirmNextMonth} onOpenChange={setConfirmNextMonth}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-medium">Start a fresh month?</DialogTitle>
            <DialogDescription>
              This replaces your current plan with a new 30 days starting today, written from your latest profile and strategy. It's included in your subscription and doesn't use any regenerate days.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setConfirmNextMonth(false)}>Cancel</Button>
            <Button className="rounded-full" onClick={startNextMonth}>Start next month</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
