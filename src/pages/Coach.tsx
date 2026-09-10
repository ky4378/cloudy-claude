import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { PilotLogo } from "@/components/pilot/BrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  ArrowUp,
  Battery,
  BatteryLow,
  Camera,
  Captions,
  Check,
  Copy,
  Eraser,
  Hash,
  Loader2,
  MessageCircle,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

type Post = Doc<"posts">;
type ThreadMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

interface CoachReply {
  reply: string;
  caption?: string;
  captionLong?: string;
  photoInstructions?: string;
  storyIdeas?: string[];
  hashtags?: string[];
  suggestions?: string[];
}

const parseReply = (content: string): CoachReply => {
  try {
    const d = JSON.parse(content) as Partial<CoachReply>;
    if (typeof d.reply === "string" && d.reply.trim()) return d as CoachReply;
  } catch {
    /* plain text */
  }
  return { reply: content };
};

const QUICK_PROMPTS = [
  "I'm opening a new location — write the caption for the announcement",
  "What should I post tomorrow?",
  "Why are my views dropping?",
  "Write a caption for my best-selling product",
];

function CopyRow({
  label,
  icon,
  text,
}: {
  label: string;
  icon: React.ReactNode;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border border-hairline bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8f8b83]">
          {icon}
          {label}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-2 py-1 text-[11px] font-semibold text-forest-800 transition-colors hover:bg-forest-200"
        >
          {copied ? (
            <>
              <Check className="size-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-[#4a473f]">
        {text}
      </p>
    </div>
  );
}

export default function Coach() {
  const [searchParams, setSearchParams] = useSearchParams();

  const data = useQuery(api.businesses.myBusiness);
  const messages = useQuery(api.coach.getThread) ?? [];
  const coachUsage = useQuery(api.coach.getCoachUsage);
  const askCoach = useAction(api.coach.askCoach);
  const clearThread = useMutation(api.coach.clearThread);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const bootRef = useRef(false);

  // Send a prompt that arrived via ?q=... (dashboard quick actions).
  useEffect(() => {
    if (bootRef.current) return;
    const q = searchParams.get("q");
    if (q && q.trim()) {
      bootRef.current = true;
      setSearchParams({}, { replace: true });
      void send(q.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the latest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);


  const send = async (raw: string) => {
    const message = raw.trim();
    if (!message || sending) return;
    setSending(true);
    setInput("");
    try {
      await askCoach({ message });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("messages")) {
        toast.error("No messages left this month. Upgrade your plan for more.");
      } else {
        toast.error("The coach couldn't answer right now. Try again.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    try {
      await clearThread();
    } catch {
      toast.error("Couldn't start a new chat right now.");
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

  if (data === null) {
    return null;
  }

  const lastReply = [...messages].reverse().find((m) => m.role === "assistant");
  const suggestions =
    lastReply && messages.length > 0
      ? parseReply(lastReply.content).suggestions
      : undefined;

  return (
    <>
      <GlassBackdrop grid={false} />

      {/* Main content — sidebar provided by AppShell */}
      <main className="px-4 pt-8 pb-16 lg:pr-6 lg:pt-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-forest-600 text-white shadow-sm">
              <MessageCircle className="size-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                AI coach
              </h1>
              <p className="text-sm text-[#6e6a60]">
                Ask for a caption, a post idea, a reel script — anything. It
                knows your business and answers in your voice.
              </p>
            </div>
          </div>

          <div className="glass-panel flex min-h-[70vh] flex-col overflow-hidden rounded-3xl lg:min-h-[calc(100vh-9rem)]">
            {/* Chat header */}
            <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4 text-forest-600" />
                <span className="text-sm font-semibold text-ink">
                  Marketing coach
                </span>
                <span className="hidden rounded-full bg-forest-100 px-2 py-0.5 text-[11px] font-semibold text-forest-800 sm:inline">
                  knows {data?.business?.businessName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 rounded-xl px-2.5 text-xs text-[#8f8b83] hover:text-ink"
              >
                <Eraser className="mr-1.5 size-3.5" />
                New chat
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {messages.length === 0 && !sending ? (
                <div className="flex h-full flex-col items-center justify-center px-2 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-forest-100 text-forest-600">
                    <Wand2 className="size-6" />
                  </div>
                  <h2 className="mt-4 font-serif text-xl font-semibold text-ink">
                    What do you want to make today?
                  </h2>
                  <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[#6e6a60]">
                    Announcing a new location, launching a product, stuck on a
                    caption? Tell the coach what you want to do — it writes the
                    whole post for you.
                  </p>
                  <div className="mt-6 grid w-full max-w-md gap-2 sm:grid-cols-2">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        disabled={sending}
                        className="rounded-2xl border border-hairline bg-white px-4 py-3 text-left text-xs font-medium leading-relaxed text-[#6e6a60] transition-all hover:border-forest-300 hover:text-forest-700 hover:shadow-sm"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m, i) => {
                    if (m.role === "user") {
                      return (
                        <div key={i} className="flex justify-end">
                          <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-forest-600 px-4 py-2.5 text-sm leading-relaxed text-white">
                            {m.content}
                          </div>
                        </div>
                      );
                    }
                    const r = parseReply(m.content);
                    return (
                      <div key={i} className="flex flex-col items-start">
                        <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-md border border-hairline bg-white px-4 py-2.5 text-sm leading-relaxed text-[#4a473f]">
                          {r.reply}
                        </div>
                        {(r.caption ||
                          r.captionLong ||
                          r.photoInstructions ||
                          (r.storyIdeas && r.storyIdeas.length > 0) ||
                          (r.hashtags && r.hashtags.length > 0)) && (
                          <div className="mt-1.5 w-full max-w-[85%] space-y-1.5">
                            {r.caption && (
                              <CopyRow
                                label="Caption"
                                icon={<Captions className="size-3.5" />}
                                text={r.caption}
                              />
                            )}
                            {r.captionLong && (
                              <CopyRow
                                label="Long caption"
                                icon={<Captions className="size-3.5" />}
                                text={r.captionLong}
                              />
                            )}
                            {r.photoInstructions && (
                              <CopyRow
                                label="Photo brief"
                                icon={<Camera className="size-3.5" />}
                                text={r.photoInstructions}
                              />
                            )}
                            {r.storyIdeas && r.storyIdeas.length > 0 && (
                              <CopyRow
                                label="Story ideas"
                                icon={<Wand2 className="size-3.5" />}
                                text={r.storyIdeas.map((s) => `• ${s}`).join("\n")}
                              />
                            )}
                            {r.hashtags && r.hashtags.length > 0 && (
                              <CopyRow
                                label="Hashtags"
                                icon={<Hash className="size-3.5" />}
                                text={r.hashtags.join(" ")}
                              />
                            )}
                          </div>
                        )}
                        {r.suggestions && r.suggestions.length > 0 && (
                          <div className="mt-2 flex max-w-[92%] flex-wrap gap-1.5">
                            {r.suggestions.map((s) => (
                              <button
                                key={s}
                                onClick={() => send(s)}
                                disabled={sending}
                                className="rounded-full border border-hairline bg-white px-3 py-1.5 text-xs font-medium text-[#6e6a60] transition-colors hover:border-forest-300 hover:text-forest-700"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {sending && (
                    <div className="flex items-end gap-2">
                      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-hairline bg-white px-4 py-2.5">
                        <Loader2 className="size-4 animate-spin text-forest-600" />
                        <span className="text-xs text-[#8f8b83]">
                          thinking about your business…
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </>
              )}
            </div>

            {/* Suggestions above the input */}
            {suggestions && suggestions.length > 0 && !sending && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2 sm:px-5">
                {suggestions.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-hairline bg-cream/70 px-3 py-1.5 text-xs font-medium text-[#6e6a60] transition-colors hover:border-forest-300 hover:text-forest-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Credits indicator */}
            {coachUsage && coachUsage.plan !== "none" && (
              <div className="flex items-center justify-center gap-2 border-t border-hairline/50 bg-cream/30 px-4 py-2">
                {coachUsage.remaining > 20 ? (
                  <Battery className="size-3.5 text-forest-600" />
                ) : coachUsage.remaining > 5 ? (
                  <BatteryLow className="size-3.5 text-amber-500" />
                ) : (
                  <BatteryLow className="size-3.5 text-red-500" />
                )}
                <span className="text-[11px] font-medium text-[#8f8b83]">
                  {coachUsage.remaining > 0 ? (
                    <>
                      <span className="font-semibold text-ink">{coachUsage.remaining}</span>
                      {" "}of {coachUsage.total} AI coach messages left this month
                      {coachUsage.remaining <= 5 && (
                        <span className="ml-1 text-[#a9a49a]">· Each question uses 1–10 credits</span>
                      )}
                    </>
                  ) : (
                    <span className="text-red-500">No AI coach messages left — upgrade your plan for more</span>
                  )}
                </span>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-hairline bg-white/70 p-3 sm:p-4">
              <div className="flex items-end gap-2 rounded-2xl border border-hairline bg-white px-3 py-2 transition-colors focus-within:border-forest-300">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder="e.g. We just opened our second shop — write the caption…"
                  rows={1}
                  className="max-h-32 min-h-6 flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-[#a9a49a]"
                />
                <Button
                  size="icon"
                  onClick={() => send(input)}
                  disabled={sending || !input.trim()}
                  className="size-9 shrink-0 rounded-xl"
                  aria-label="Send"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </Button>
              </div>
              <p className="mt-2 px-1 text-center text-[11px] text-[#a9a49a]">
                Uses 1–10 credits per question depending on complexity. Enter to send, Shift+Enter for a new line.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
