import type { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Clapperboard,
  Instagram,
  LayoutGrid,
  Circle,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CONTENT_TYPE_META, todayString } from "@/convex/lib/strategy";

type Post = Doc<"posts">;

const cardDateLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
};

const firstHashtags = (post: Post, count = 4) =>
  [
    ...post.hashtagGroups.local,
    ...post.hashtagGroups.industry,
    ...post.hashtagGroups.trending,
    ...post.hashtagGroups.branded,
  ]
    .slice(0, count)
    .join(" ");

const TYPE_OPTIONS = ["All", "Reel", "Carousel", "Photo Post", "Story Post"] as const;
const PLATFORM_OPTIONS = ["All", "Instagram"] as const;

const dayOfWeek = (iso: string) => new Date(`${iso}T00:00:00`).getDay(); // 0 = Sun

export function CalendarSection({
  posts,
  accentColor,
  onOpenPost,
  onToggleStatus,
}: {
  posts: Post[];
  accentColor?: string;
  onOpenPost: (post: Post) => void;
  onToggleStatus: (postId: string, status: "planned" | "done") => void;
}) {
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>("All");
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]>("All");

  const filtered = useMemo(
    () =>
      posts.filter(
        (p) =>
          (type === "All" || p.contentType === type) &&
          (platform === "All" || p.platform === platform),
      ),
    [posts, type, platform],
  );

  const stats = useMemo(() => {
    const total = posts.length;
    const reels = posts.filter((p) => p.contentType === "Reel").length;
    const carousels = posts.filter((p) => p.contentType === "Carousel").length;
    const done = posts.filter((p) => p.status === "done").length;
    return { total, reels, carousels, done };
  }, [posts]);

  // Group into Monday-start weeks
  const weeks = useMemo(() => {
    const result: Post[][] = [];
    let current: Post[] = [];
    let lastDow = -1;
    for (const post of filtered) {
      const dow = dayOfWeek(post.date);
      if (current.length > 0 && (dow <= lastDow)) {
        result.push(current);
        current = [];
      }
      current.push(post);
      lastDow = dow;
    }
    if (current.length > 0) result.push(current);
    return result;
  }, [filtered]);

  const today = todayString();

  const weekRange = (week: Post[]) => {
    const first = new Date(`${week[0].date}T00:00:00`);
    const last = new Date(`${week[week.length - 1].date}T00:00:00`);
    return `${first.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${last.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const TypeIcon = ({ t }: { t: Post["contentType"] }) =>
    t === "Reel" ? (
      <Clapperboard className="size-3" />
    ) : t === "Carousel" ? (
      <LayoutGrid className="size-3" />
    ) : t === "Photo Post" ? (
      <Camera className="size-3" />
    ) : (
      <Circle className="size-3" />
    );

  return (
    <section id="calendar" className="scroll-mt-24">
      <div className="glass-panel rounded-3xl p-5 md:p-7">
        {/* Stats strip */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Posts planned", value: stats.total, icon: CalendarDays },
            { label: "Reels", value: stats.reels, icon: Clapperboard },
            { label: "Carousels", value: stats.carousels, icon: LayoutGrid },
            { label: "Completed", value: stats.done, icon: CheckCircle2 },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-2xl border border-hairline bg-white p-3.5"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: accentColor ?? "#416557" }}
              >
                <s.icon className="size-4" />
              </span>
              <div>
                <p className="text-lg font-bold leading-none text-ink">
                  {s.value}
                </p>
                <p className="mt-1 text-[11px] font-medium text-[#8f8b83]">
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-[#8f8b83]">
            Content
          </span>
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                type === t
                  ? "bg-ink text-white"
                  : "glass-chip text-[#6e6a60] hover:-translate-y-0.5"
              }`}
            >
              {t === "All" ? "All" : CONTENT_TYPE_META[t].label}
            </button>
          ))}
          <span className="ml-3 mr-1 text-xs font-semibold uppercase tracking-wider text-[#8f8b83]">
            Platform
          </span>
          {PLATFORM_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                platform === p
                  ? "bg-ink text-white"
                  : "glass-chip text-[#6e6a60] hover:-translate-y-0.5"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {weeks.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-hairline bg-cream/40 py-14 text-center">
            <Sparkles className="size-8 text-[#c9c4b9]" />
            <p className="mt-3 text-sm font-semibold text-[#6e6a60]">
              No posts match these filters
            </p>
            <button
              onClick={() => {
                setType("All");
                setPlatform("All");
              }}
              className="mt-2 text-sm font-semibold text-forest-700 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop week grid */}
            <div className="mt-6 hidden space-y-5 md:block">
              {weeks.map((week, wi) => (
                <div key={wi}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8f8b83]">
                      {weekRange(week)}
                    </span>
                    <span className="h-px flex-1 bg-hairline" />
                    <Badge className="rounded-full bg-forest-100 text-forest-800 hover:bg-forest-100">
                      {week.length} {week.length === 1 ? "post" : "posts"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const post = week[i];
                      if (!post) {
                        return (
                          <div
                            key={`empty-${i}`}
                            className="rounded-2xl border border-dashed border-hairline bg-white/50"
                          />
                        );
                      }
                      const isToday = post.date === today;
                      const isDone = post.status === "done";
                      return (
                        <div
                          key={post._id}
                          className={`group relative flex min-h-44 flex-col rounded-2xl border p-3 text-left transition-all hover:-translate-y-1 ${
                            isDone
                              ? "border-forest-200 bg-forest-50"
                              : isToday
                                ? "border-forest-300 bg-forest-50"
                                : "border-hairline bg-white hover:border-forest-200 hover:bg-forest-50/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span
                              className={`text-[10px] font-bold uppercase leading-tight ${
                                isToday ? "text-forest-800" : "text-[#8f8b83]"
                              }`}
                            >
                              {cardDateLabel(post.date)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onToggleStatus(post._id, isDone ? "planned" : "done")
                              }
                              aria-label={isDone ? "Mark as not done" : "Mark as done"}
                              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                isDone
                                  ? "border-forest-600 bg-forest-600 text-white"
                                  : "border-[#d8d3c9] bg-white text-transparent hover:border-forest-500 hover:bg-forest-50"
                              }`}
                            >
                              <Check className="size-3" strokeWidth={3} />
                            </button>
                          </div>

                          {/* Content type + platform pills */}
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold tracking-wide text-white">
                              <TypeIcon t={post.contentType} />
                              {CONTENT_TYPE_META[post.contentType].label.toUpperCase()}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white px-2 py-0.5 text-[9px] font-semibold text-[#6e6a60]">
                              <Instagram className="size-2.5 shrink-0" />
                              Instagram
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onOpenPost(post)}
                            className="mt-2 flex flex-1 flex-col text-left"
                          >
                            <p
                              className={`line-clamp-2 text-xs font-semibold leading-snug ${
                                isDone ? "text-[#9c978d] line-through" : "text-ink"
                              }`}
                            >
                              {post.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#a9a49a]">
                              {post.captionShort}
                            </p>
                          </button>

                          <div className="mt-auto pt-2">
                            <div className="mb-1.5 h-px bg-hairline" />
                            <p className="truncate text-[9px] font-medium text-[#a9a49a]">
                              {firstHashtags(post)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile list */}
            <div className="mt-6 space-y-2.5 md:hidden">
              {filtered.map((post) => {
                const isToday = post.date === today;
                const isDone = post.status === "done";
                return (
                  <div
                    key={post._id}
                    className={`rounded-2xl border p-3.5 text-left transition-colors ${
                      isDone
                        ? "border-forest-200 bg-forest-50"
                        : isToday
                          ? "border-forest-300 bg-forest-50"
                          : "border-hairline bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="pt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8f8b83]">
                        {cardDateLabel(post.date)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onToggleStatus(post._id, isDone ? "planned" : "done")
                        }
                        aria-label={isDone ? "Mark as not done" : "Mark as done"}
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          isDone
                            ? "border-forest-600 bg-forest-600 text-white"
                            : "border-[#d8d3c9] bg-white text-transparent hover:border-forest-500"
                        }`}
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPost(post)}
                      className="mt-2 flex w-full flex-col text-left"
                    >
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                          <TypeIcon t={post.contentType} />
                          {CONTENT_TYPE_META[post.contentType].label.toUpperCase()}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#6e6a60]">
                          <Instagram className="size-3 shrink-0" />
                          Instagram
                        </span>
                      </span>
                      <span
                        className={`mt-2 text-sm font-semibold leading-snug ${
                          isDone ? "text-[#9c978d] line-through" : "text-ink"
                        }`}
                      >
                        {post.title}
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs leading-snug text-[#a9a49a]">
                        {post.captionShort}
                      </span>
                      <span className="mt-2 block truncate border-t border-hairline pt-1.5 text-[10px] font-medium text-[#a9a49a]">
                        {firstHashtags(post)}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
