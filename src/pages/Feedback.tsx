import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { RATINGS } from "@/components/pilot/FeedbackDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Check,
  Heart,
  Loader2,
  MessageSquareHeart,
  Send,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

const RATING_EMOJI = ["", "😞", "😕", "🙂", "😊", "🤩"];

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function Feedback() {
  const data = useQuery(api.businesses.myBusiness);
  const history = useQuery(api.feedback.getMyFeedback);
  const submitFeedback = useMutation(api.feedback.submitFeedback);
  const regenerateCalendar = useAction(api.plan.regenerateCalendar);
  const [rating, setRating] = useState<number | null>(null);
  const [whatWorks, setWhatWorks] = useState("");
  const [improve, setImprove] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);


  const business = data?.business ?? null;
  const posts = data?.posts ?? [];
  const submissions = history?.submissions ?? [];


  const handleRegenerate = async () => {
    if (!business) return;
    try {
      await regenerateCalendar({ businessId: business._id });
      toast.success("Fresh 30-day plan generated ✨");
    } catch {
      toast.error("Couldn't regenerate the plan. Try again.");
    }
  };

  const handleSubmit = async () => {
    if (rating === null || submitting) return;
    setSubmitting(true);
    try {
      await submitFeedback({ rating, whatWorks, improve });
      setRating(null);
      setWhatWorks("");
      setImprove("");
      setSent(true);
      setTimeout(() => setSent(false), 4000);
      toast.success("Thanks — your feedback helps us improve 💚");
    } catch {
      toast.error("Couldn't send feedback. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (data === undefined) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <GlassBackdrop grid={false} />
        <Loader2 className="size-7 animate-spin text-forest-600" />
      </div>
    );
  }

  if (data === null || !business) {
    return null;
  }

  return (
    <>
      <GlassBackdrop grid={false} />

      {/* Main content */}
      <main className="px-4 pt-24 pb-16 lg:pl-[330px] lg:pr-6 lg:pt-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-forest-600 text-white shadow-sm">
              <Heart className="size-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                Feedback
              </h1>
              <p className="text-sm text-[#6e6a60]">
                Your opinion shapes Cloudy. Tell us what&apos;s working and
                what should change.
              </p>
            </div>
          </div>

          {/* Submission form */}
          <section className="glass-panel rounded-3xl p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">
                  How&apos;s it going with {business.businessName}?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-[#6e6a60]">
                  We check in once after your first day, then every month.
                  Honest answers — the good and the bad — help us build what
                  you actually need.
                </p>
              </div>
              {sent && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-forest-100 px-2.5 py-1 text-xs font-semibold text-forest-800">
                  <Check className="size-3.5" />
                  Sent
                </span>
              )}
            </div>

            {/* Rating */}
            <div className="mt-5 flex items-center justify-between gap-1">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRating(r.value)}
                  aria-label={r.label}
                  title={r.label}
                  className={`flex size-12 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-all ${
                    rating === r.value
                      ? "scale-105 border-forest-500 bg-forest-50 shadow-[0_6px_20px_-8px_rgba(65,101,87,0.5)]"
                      : "border-hairline bg-white hover:border-forest-300"
                  }`}
                >
                  <span className="text-xl leading-none">{r.emoji}</span>
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wide ${
                      rating === r.value ? "text-forest-700" : "text-[#8f8b83]"
                    }`}
                  >
                    {r.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Textareas */}
            <div className="mt-5 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8f8b83]">
                  What&apos;s working well?
                </span>
                <Textarea
                  value={whatWorks}
                  onChange={(e) => setWhatWorks(e.target.value)}
                  placeholder="e.g. The captions save me hours, the calendar keeps me consistent…"
                  className="min-h-20 rounded-2xl border-hairline bg-white text-sm text-ink placeholder:text-[#b3aea4]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8f8b83]">
                  What should we improve?
                </span>
                <Textarea
                  value={improve}
                  onChange={(e) => setImprove(e.target.value)}
                  placeholder="e.g. I'd love Instagram scheduling, more story ideas, a posting time picker…"
                  className="min-h-20 rounded-2xl border-hairline bg-white text-sm text-ink placeholder:text-[#b3aea4]"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={rating === null || submitting}
                className="rounded-xl"
              >
                {submitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Send className="mr-2 size-4" />
                )}
                Send feedback
              </Button>
            </div>
          </section>

          {/* History */}
          <section className="glass-panel rounded-3xl p-6 sm:p-7">
            <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">
              Your past feedback
            </h2>
            {submissions.length === 0 ? (
              <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-hairline bg-cream/40 px-6 py-10 text-center">
                <MessageSquareHeart className="size-6 text-forest-400" />
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6e6a60]">
                  No feedback yet — your first check-in lands a day after you
                  create your business, then once a month. You can also leave
                  feedback anytime from this page.
                </p>
              </div>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {submissions.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-hairline bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xl leading-none">
                        {RATING_EMOJI[s.rating] ?? "🙂"}
                      </span>
                      <span className="text-xs font-medium text-[#8f8b83]">
                        {formatDate(s.createdAt)}
                      </span>
                    </div>
                    {s.whatWorks && (
                      <p className="mt-2.5 text-sm leading-relaxed text-[#4a473f]">
                        <span className="font-semibold text-forest-700">
                          Working well:
                        </span>{" "}
                        {s.whatWorks}
                      </p>
                    )}
                    {s.improve && (
                      <p className="mt-1.5 text-sm leading-relaxed text-[#4a473f]">
                        <span className="font-semibold text-ink">
                          Improve:
                        </span>{" "}
                        {s.improve}
                      </p>
                    )}
                    {!s.whatWorks && !s.improve && (
                      <p className="mt-2.5 text-sm italic text-[#8f8b83]">
                        {s.rating >= 4
                          ? "Happy with Cloudy ✨"
                          : "Had a rough week — noted, and thank you for telling us."}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* What we do with it */}
          <section className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-hairline bg-cream/40 px-6 py-8 text-center">
            <Sparkles className="size-6 text-forest-400" />
            <p className="max-w-md text-sm leading-relaxed text-[#6e6a60]">
              Every check-in goes straight to the Cloudy team. Ratings and
              notes are read for real, and the &quot;improve&quot; answers
              decide what we build next.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
