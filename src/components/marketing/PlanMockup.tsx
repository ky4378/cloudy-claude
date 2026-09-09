import { CONTENT_TYPE_META, samplePlan, type DayPlan } from "@/convex/lib/strategy";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Camera,
  Clapperboard,
  Clock3,
  Hash,
  LayoutGrid,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

type MockStatus = "Posted" | "Ready" | "Draft";

export interface MockDay extends DayPlan {
  status: MockStatus;
}

const weekday = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
const dayNum = (iso: string) => new Date(`${iso}T00:00:00`).getDate();
const monthLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

const statusFor = (i: number): MockStatus => (i < 4 ? "Posted" : i < 12 ? "Ready" : "Draft");

const STATUS_CLASS: Record<MockStatus, string> = {
  Posted: "bg-primary text-primary-foreground",
  Ready: "bg-sage text-forest-700",
  Draft: "bg-cream text-secondary-text",
};

const DOT_CLASS: Record<MockStatus, string> = {
  Posted: "bg-ink",
  Ready: "bg-forest-300",
  Draft: "bg-hairline",
};

/** Sample plan with the showcase days from the product spec layered on top. */
export const MOCK_DAYS: MockDay[] = (() => {
  const days: MockDay[] = samplePlan.map((d, i) => ({ ...d, status: statusFor(i) }));
  const monday = days.findIndex((d) => new Date(`${d.date}T00:00:00`).getDay() === 1);
  const start = monday >= 0 ? monday : 0;
  const overrides: Partial<MockDay>[] = [
    {
      contentType: "Reel",
      title: "Behind the scenes",
      subject: "the hour before opening",
      hook: "What customers don't see before opening...",
      captionLong:
        "6:40am. lights on, first grind of the day, and the pastry case still empty. by 8 it looks effortless — this is the part that makes it possible. come say hi when the doors open ☕",
      goal: "Build trust",
      time: "7:00 PM",
      cta: "Come say hi when the doors open",
      hashtagGroups: {
        local: ["#portlandcoffee", "#pdxeats", "#shoplocalpdx"],
        industry: ["#specialtycoffee", "#baristalife", "#behindthescenes"],
        trending: ["#smallbusiness", "#dayinthelife"],
        branded: ["#cornerandbean"],
      },
      status: "Ready",
    },
    {
      contentType: "Carousel",
      title: "Educational content",
      subject: "how to order the right milk for your drink",
      hook: "Oat, whole or almond? Here's what actually changes.",
      goal: "Increase followers",
      time: "12:00 PM",
      status: "Ready",
    },
    {
      contentType: "Photo Post",
      title: "Product spotlight",
      subject: "the honey-lavender latte",
      hook: "Our most-ordered drink this spring, up close.",
      goal: "Increase sales",
      time: "11:00 AM",
      status: "Draft",
    },
  ];
  overrides.forEach((o, k) => {
    const idx = start + k;
    if (days[idx]) days[idx] = { ...days[idx], ...o, videoScript: o.contentType === "Reel" ? days[idx].videoScript : undefined };
  });
  return days;
})();

export const TYPE_ICON = {
  Reel: Clapperboard,
  "Video Post": Clapperboard,
  Carousel: LayoutGrid,
  "Photo Post": Camera,
  "Story Post": Sparkles,
} as const;

function StatusPill({ status }: { status: MockStatus }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_CLASS[status])}>
      {status}
    </span>
  );
}

function Field({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary-text">
        <Icon className="size-3 text-forest-600" />
        {label}
      </p>
      <div className="mt-1 text-[13px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}

function DayDetail({ day, compact = false }: { day: MockDay; compact?: boolean }) {
  const Icon = TYPE_ICON[day.contentType];
  const tags = [
    ...day.hashtagGroups.local,
    ...day.hashtagGroups.industry,
    ...day.hashtagGroups.branded,
  ].slice(0, compact ? 4 : 7);
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sage px-2.5 py-1 text-[11px] font-semibold text-forest-700">
          <Icon className="size-3.5" />
          Instagram {CONTENT_TYPE_META[day.contentType].label}
        </span>
        <StatusPill status={day.status} />
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-secondary-text">
          <Clock3 className="size-3.5" />
          Best time {day.time}
        </span>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary-text">
          Post idea
        </p>
        <p className="mt-1 font-serif text-xl font-medium leading-tight tracking-tight text-ink">
          {day.title}
        </p>
      </div>
      <Field icon={Lightbulb} label="Hook">
        <span className="italic">“{day.hook ?? day.videoScript?.hook ?? day.title}”</span>
      </Field>
      <Field icon={MessageSquareText} label="Caption">
        <p className={cn("whitespace-pre-line", compact && "line-clamp-3")}>{day.captionLong}</p>
      </Field>
      <Field icon={Hash} label="Hashtags">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-md bg-cream px-1.5 py-0.5 text-[11px] text-forest-700">
              {t}
            </span>
          ))}
        </div>
      </Field>
      {!compact && (
        <div className="grid grid-cols-2 gap-4">
          <Field icon={Target} label="Goal">
            {day.goal}
          </Field>
          <Field icon={Sparkles} label="Call to action">
            {day.cta}
          </Field>
        </div>
      )}
      {!compact && day.videoScript && (
        <Field icon={Clapperboard} label="Reel script">
          <ol className="space-y-1">
            {day.videoScript.scenes.slice(0, 3).map((s, i) => (
              <li key={i} className="line-clamp-2 text-[12px] text-secondary-text">
                {s}
              </li>
            ))}
          </ol>
        </Field>
      )}
    </div>
  );
}

/** Small window chrome shared by both mockups. */
function Window({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "card-surface overflow-hidden rounded-[1.75rem] shadow-[0_30px_80px_-40px_rgba(23,23,23,0.35)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-hairline bg-paper/70 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-hairline" />
        <span className="size-2.5 rounded-full bg-hairline" />
        <span className="size-2.5 rounded-full bg-hairline" />
        <span className="ml-3 text-[11px] font-medium text-secondary-text">
          Cloudy · Corner &amp; Bean · 30-day plan
        </span>
      </div>
      {children}
    </div>
  );
}

const FLOATING = [
  { label: "Caption ready", icon: MessageSquareText, className: "-left-3 top-16 md:-left-10" },
  { label: "Reel idea", icon: Clapperboard, className: "-right-3 top-8 md:-right-8" },
  { label: "Post scheduled", icon: CalendarDays, className: "-left-2 bottom-20 md:-left-12" },
  { label: "Trend found", icon: TrendingUp, className: "-right-2 bottom-10 md:-right-10" },
];

/** Compact hero preview: week strip + selected day. */
export function HeroMockup() {
  const [selected, setSelected] = useState(0);
  const week = MOCK_DAYS.slice(0, 7);
  const day = week[selected];
  return (
    <div className="relative mx-auto max-w-4xl">
      {FLOATING.map((f, i) => (
        <div
          key={f.label}
          className={cn(
            "glass-chip absolute z-10 hidden items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink shadow-md sm:flex",
            f.className,
          )}
          style={{ animation: `float 6s ease-in-out ${i * 0.8}s infinite` }}
        >
          <f.icon className="size-3.5 text-forest-600" />
          {f.label}
        </div>
      ))}
      <Window>
        <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
          <div className="border-b border-hairline p-5 md:border-b-0 md:border-r">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary-text">
                This week
              </p>
              <p className="text-xs text-secondary-text">{monthLabel(week[0].date)}</p>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {week.map((d, i) => {
                const Icon = TYPE_ICON[d.contentType];
                const active = i === selected;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] transition-colors",
                      active
                        ? "border-ink bg-primary text-primary-foreground"
                        : "border-hairline bg-white text-secondary-text hover:border-forest-300",
                    )}
                  >
                    <span className="font-semibold uppercase">{weekday(d.date)}</span>
                    <span className={cn("font-serif text-base", active ? "text-white" : "text-ink")}>
                      {dayNum(d.date)}
                    </span>
                    <Icon className="size-3.5" />
                    <span className={cn("size-1.5 rounded-full", active ? "bg-white" : DOT_CLASS[d.status])} />
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-2">
              {week.slice(0, 4).map((d, i) => {
                const Icon = TYPE_ICON[d.contentType];
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                      i === selected ? "border-forest-300 bg-sage/60" : "border-hairline bg-white hover:bg-paper",
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-forest-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{d.title}</p>
                      <p className="truncate text-[11px] text-secondary-text">
                        {CONTENT_TYPE_META[d.contentType].label} · {d.time}
                      </p>
                    </div>
                    <StatusPill status={d.status} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-5">
            <DayDetail day={day} compact />
          </div>
        </div>
      </Window>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

/** Full product preview: sidebar + 30-day calendar + detail panel. */
export function ProductMockup() {
  const monday = useMemo(
    () => Math.max(0, MOCK_DAYS.findIndex((d) => new Date(`${d.date}T00:00:00`).getDay() === 1)),
    [],
  );
  const [selected, setSelected] = useState(monday);
  const day = MOCK_DAYS[selected];
  const leading = new Date(`${MOCK_DAYS[0].date}T00:00:00`).getDay();
  const nav = ["Dashboard", "30-Day Plan", "Content", "Insights", "Competitors", "Settings"];
  return (
    <Window>
      <div className="grid md:grid-cols-[160px_1fr_1.05fr]">
        <aside className="hidden border-r border-hairline bg-sidebar p-4 md:block">
          <p className="font-serif text-lg font-semibold text-ink">
            Cloudy <span className="text-forest-600">✦</span>
          </p>
          <ul className="mt-5 space-y-1">
            {nav.map((n, i) => (
              <li
                key={n}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[12px] font-medium",
                  i === 1 ? "bg-primary text-primary-foreground" : "text-secondary-text",
                )}
              >
                {n}
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-xl border border-hairline bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary-text">
              AI credits
            </p>
            <p className="mt-1 font-serif text-lg text-ink">64 / 100</p>
            <div className="mt-2 h-1.5 rounded-full bg-cream">
              <div className="h-1.5 w-[64%] rounded-full bg-ink" />
            </div>
          </div>
        </aside>
        <div className="border-b border-hairline p-5 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary-text">
                30-day calendar
              </p>
              <p className="font-serif text-lg font-medium text-ink">{monthLabel(MOCK_DAYS[0].date)}</p>
            </div>
            <div className="flex gap-2 text-[10px] text-secondary-text">
              <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-ink" />Posted</span>
              <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-forest-300" />Ready</span>
              <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-hairline" />Draft</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-secondary-text">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: leading }).map((_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {MOCK_DAYS.map((d, i) => {
              const Icon = TYPE_ICON[d.contentType];
              const active = i === selected;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-label={`Day ${i + 1}: ${d.title}`}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-[10px] transition-colors",
                    active
                      ? "border-ink bg-primary text-primary-foreground"
                      : "border-hairline bg-white text-ink hover:border-forest-300",
                  )}
                >
                  <span className="font-medium">{dayNum(d.date)}</span>
                  <Icon className="size-3" />
                  <span className={cn("size-1 rounded-full", active ? "bg-white" : DOT_CLASS[d.status])} />
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary-text">
            {weekday(day.date)}, {monthLabel(day.date).split(" ")[0]} {dayNum(day.date)}
          </p>
          <DayDetail day={day} />
        </div>
      </div>
    </Window>
  );
}
