import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const RATINGS = [
  { value: 1, emoji: "😞", label: "Not happy" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "🙂", label: "Okay" },
  { value: 4, emoji: "😊", label: "Happy" },
  { value: 5, emoji: "🤩", label: "Love it" },
];

// After closing without submitting, don't nag again for a day.
const DISMISS_KEY = "contentpilot_feedback_dismissed_at";
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function FeedbackDialog({
  due,
  businessName,
  open,
  onOpenChange,
}: {
  due: boolean;
  businessName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const submitFeedback = useMutation(api.feedback.submitFeedback);
  const [rating, setRating] = useState<number | null>(null);
  const [whatWorks, setWhatWorks] = useState("");
  const [improve, setImprove] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-open when feedback is due (1 day after signup, then monthly) unless
  // dismissed recently.
  useEffect(() => {
    if (!due) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;
    onOpenChange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due]);

  // Remember any dismissal (X, overlay, ESC, "Not now") so we don't re-open
  // within the same day. After a successful submit this is harmless — the
  // server-side "due" flag flips to false for a full month.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (rating === null || submitting) return;
    setSubmitting(true);
    try {
      await submitFeedback({ rating, whatWorks, improve });
      localStorage.removeItem(DISMISS_KEY);
      setRating(null);
      setWhatWorks("");
      setImprove("");
      onOpenChange(false);
      toast.success("Thanks — your feedback helps us improve 💚");
    } catch {
      toast.error("Couldn't send feedback. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-5 rounded-3xl border-hairline bg-cream p-7 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.4)]"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-forest-600 text-white">
          <Heart className="size-5" />
        </div>
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="font-serif text-2xl font-semibold tracking-tight text-ink">
            How&apos;s it going with {businessName}?
          </DialogTitle>
          <DialogDescription className="mx-auto max-w-xs text-sm leading-relaxed text-[#6e6a60]">
            Quick check-in: 48 hours after signup, then two weeks later,
            then once a month — so we can make Cloudy better for you.
          </DialogDescription>
        </DialogHeader>

        {/* Rating */}
        <div className="flex items-center justify-between gap-1">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRating(r.value)}
              aria-label={r.label}
              title={r.label}
              className={`flex size-12 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-all ${
                rating === r.value
                  ? "border-forest-500 bg-forest-50 shadow-[0_6px_20px_-8px_rgba(65,101,87,0.5)] scale-105"
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
        <div className="flex flex-col gap-3">
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

        <DialogFooter className="gap-2 sm:flex-row">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="flex-1 rounded-xl text-[#6e6a60]"
          >
            Not now
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === null || submitting}
            className="flex-1 rounded-xl"
          >
            {submitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 size-4" />
            )}
            Send feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
