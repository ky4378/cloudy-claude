import type { Doc } from "@/convex/_generated/dataModel";
import {
  Camera,
  Check,
  CheckCircle2,
  Clapperboard,
  Instagram,
  LayoutGrid,
  MessageCircle,
  PartyPopper,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { CONTENT_TYPE_META, todayString } from "@/convex/lib/strategy";

type Post = Doc<"posts">;

const PLATFORM_ICON = { Instagram } as const;

const REMINDERS = [
  { id: "comments", label: "Reply to comments within 2 hours", icon: MessageCircle },
  { id: "engage", label: "Engage with 5 local accounts", icon: Sparkles },
  { id: "film", label: "Film tomorrow's content", icon: Camera },
  { id: "review", label: "Weekly analytics review", icon: Trophy },
];

export function TodayTasks({
  posts,
  accentColor,
  onToggleStatus,
  onOpenPost,
}: {
  posts: Post[];
  accentColor?: string;
  onToggleStatus: (postId: string, status: "planned" | "done") => void;
  onOpenPost: (post: Post) => void;
}) {
  const [reminders, setReminders] = useState<Record<string, boolean>>({});
  const today = todayString();
  const todayPosts = posts.filter((p) => p.date === today);
  const done = todayPosts.filter((p) => p.status === "done").length;
  const nextPost = posts.find((p) => p.date > today && p.status !== "done");
  const pct = todayPosts.length > 0 ? Math.round((done / todayPosts.length) * 100) : 0;

  const toggleReminder = (id: string) =>
    setReminders((r) => ({ ...r, [id]: !r[id] }));

  return (
    <section id="today" className="scroll-mt-24">
      <div className="glass-panel rounded-3xl p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8f8b83]">
              Today · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-ink">
              Today&apos;s tasks
            </h2>
          </div>
          {todayPosts.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-ink">
                  {done} of {todayPosts.length}
                </p>
                <p className="text-[11px] font-medium text-[#8f8b83]">done</p>
              </div>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full rounded-full bg-forest-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {todayPosts.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-hairline bg-cream/50 p-6 text-center">
            <PartyPopper className="mx-auto size-7 text-forest-400" />
            <p className="mt-2 text-sm font-semibold text-ink">
              No posts scheduled today
            </p>
            {nextPost ? (
              <p className="mt-1 text-sm text-[#6e6a60]">
                Next up:{" "}
                <button
                  onClick={() => onOpenPost(nextPost)}
                  className="font-semibold text-forest-700 hover:underline"
                >
                  {nextPost.title}
                </button>{" "}
                on{" "}
                {new Date(`${nextPost.date}T00:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            ) : (
              <p className="mt-1 text-sm text-[#6e6a60]">
                Your plan is complete — nice work. 🎉
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {todayPosts.map((post) => {
              const Icon = PLATFORM_ICON[post.platform] ?? Instagram;
              const isDone = post.status === "done";
              return (
                <div
                  key={post._id}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${
                    isDone
                      ? "border-forest-200 bg-forest-50"
                      : "border-hairline bg-white"
                  }`}
                >
                  <button
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
                  <button
                    onClick={() => onOpenPost(post)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: accentColor ?? "#416557" }}
                    >
                      {post.contentType === "Reel" ? (
                        <Clapperboard className="size-4" />
                      ) : post.contentType === "Carousel" ? (
                        <LayoutGrid className="size-4" />
                      ) : (
                        <Camera className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-semibold ${
                          isDone ? "text-[#9c978d] line-through" : "text-ink"
                        }`}
                      >
                        {post.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[#8f8b83]">
                        <Icon className="size-3.5" />
                        {post.platform} ·{" "}
                        {CONTENT_TYPE_META[post.contentType].label}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Daily reminders */}
        <div className="mt-5 border-t border-hairline pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8f8b83]">
            Daily habits
          </p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {REMINDERS.map((r) => {
              const checked = reminders[r.id];
              return (
                <button
                  key={r.id}
                  onClick={() => toggleReminder(r.id)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                    checked
                      ? "border-forest-200 bg-forest-50 text-[#9c978d]"
                      : "border-hairline bg-white text-[#6e6a60] hover:bg-cream/60"
                  }`}
                >
                  <r.icon
                    className={`size-4 shrink-0 ${checked ? "text-forest-600" : "text-forest-500"}`}
                  />
                  <span className={checked ? "line-through" : ""}>{r.label}</span>
                  {checked && <CheckCircle2 className="ml-auto size-4 text-forest-600" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
