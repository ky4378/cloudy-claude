import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import { CONTENT_TYPE_META } from "@/convex/lib/strategy";
import { cn } from "@/lib/utils";
import { useAction, useMutation } from "convex/react";
import {
  Camera,
  Captions,
  Check,
  Clapperboard,
  Clock3,
  Copy,
  Hash,
  Lightbulb,
  Loader2,
  Megaphone,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { StatusBadge } from "./StatusBadge";
import { allHashtags, copyText, errorMessage, longDate, type Post } from "./useAppData";

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-text">
          <Icon className="size-3.5 text-forest-600" />
          {title}
        </p>
        {action}
      </div>
      <div className="text-sm leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 rounded-lg px-2 text-xs text-secondary-text"
      onClick={async () => {
        const ok = await copyText(text);
        if (ok) {
          setDone(true);
          toast.success("Copied");
          window.setTimeout(() => setDone(false), 1500);
        } else toast.error("Couldn't copy");
      }}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {label}
    </Button>
  );
}

export function PostDetailSheet({
  post,
  open,
  onOpenChange,
}: {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateStatus = useMutation(api.businesses.updatePostStatus);
  const applyCaption = useMutation(api.businesses.applyCaption);
  const regeneratePost = useAction(api.plan.regeneratePost);
  const generateCaptions = useAction(api.ai.generateCaptions);
  const generateHashtags = useAction(api.ai.generateHashtags);
  const generateReelScript = useAction(api.ai.generateReelScript);

  const [busy, setBusy] = useState<null | "regen" | "captions" | "hashtags" | "script" | "status">(null);
  const [captions, setCaptions] = useState<string[]>([]);

  useEffect(() => {
    setCaptions([]);
  }, [post?._id]);

  if (!post) return null;
  const meta = CONTENT_TYPE_META[post.contentType];
  const isVideo = meta.needsVideo;
  const tags = allHashtags(post);

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<unknown>, success?: string) => {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
      if (success) toast.success(success);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const setStatus = (status: "planned" | "done" | "skipped") =>
    run("status", () => updateStatus({ postId: post._id, status }), status === "done" ? "Marked as posted" : undefined);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto bg-paper p-0 sm:max-w-xl">
        <div className="p-6">
          <SheetHeader className="p-0 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sage px-2.5 py-1 text-[11px] font-semibold text-forest-700">
                {meta.emoji} Instagram {meta.label}
              </span>
              <StatusBadge status={post.status} />
              {post.time && (
                <span className="inline-flex items-center gap-1 text-xs text-secondary-text">
                  <Clock3 className="size-3.5" /> {post.time}
                </span>
              )}
            </div>
            <SheetDescription className="mt-3 text-xs font-semibold uppercase tracking-wider text-secondary-text">
              Day {post.dayIndex + 1} · {longDate(post.date)}
            </SheetDescription>
            <SheetTitle className="font-serif text-2xl font-medium leading-tight tracking-tight text-ink">
              {post.title}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-5 flex flex-wrap gap-2">
            {(["planned", "done", "skipped"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={post.status === s ? "default" : "outline"}
                className="rounded-full"
                disabled={busy !== null}
                onClick={() => setStatus(s)}
              >
                {s === "planned" ? "Ready" : s === "done" ? "Posted" : "Skipped"}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto rounded-full text-secondary-text"
              disabled={busy !== null}
              onClick={() => run("regen", () => regeneratePost({ postId: post._id }), "Post regenerated")}
            >
              {busy === "regen" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Regenerate
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Section icon={Target} title="Objective">{post.goal}</Section>
              <Section icon={Clock3} title="Suggested time">{post.time ?? "Any time"}</Section>
            </div>
            <Section icon={Lightbulb} title="Hook">
              <p className="font-serif text-lg leading-snug">“{post.hook ?? post.videoScript?.hook ?? post.title}”</p>
            </Section>
            <Section icon={Camera} title={isVideo ? "What to film" : "What to shoot"}>
              {post.photoInstructions}
            </Section>
            <Section
              icon={Captions}
              title="Caption"
              action={
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg px-2 text-xs text-forest-700"
                    disabled={busy !== null}
                    onClick={() =>
                      run("captions", async () => {
                        const res = await generateCaptions({ postId: post._id, count: 3 });
                        setCaptions(res.captions);
                      })
                    }
                  >
                    {busy === "captions" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    More captions
                  </Button>
                  <CopyButton text={post.captionLong} />
                </div>
              }
            >
              <p className="whitespace-pre-line">{post.captionLong}</p>
              {captions.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-hairline pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">Alternatives</p>
                  {captions.map((c, i) => (
                    <div key={i} className="rounded-xl bg-paper p-3">
                      <p className="whitespace-pre-line text-sm">{c}</p>
                      <div className="mt-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-lg text-xs"
                          onClick={() =>
                            run("status", async () => {
                              await applyCaption({ postId: post._id, caption: c });
                              setCaptions([]);
                            }, "Caption updated")
                          }
                        >
                          Use this
                        </Button>
                        <CopyButton text={c} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            <Section
              icon={Hash}
              title="Hashtags"
              action={
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg px-2 text-xs text-forest-700"
                    disabled={busy !== null}
                    onClick={() => run("hashtags", async () => { await generateHashtags({ postId: post._id }); }, "Hashtags refreshed")}
                  >
                    {busy === "hashtags" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                    Refresh
                  </Button>
                  <CopyButton text={tags.join(" ")} label="Copy all" />
                </div>
              }
            >
              {(["local", "industry", "trending", "branded"] as const).map((g) =>
                post.hashtagGroups[g].length ? (
                  <div key={g} className="mb-2 last:mb-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary-text">{g}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {post.hashtagGroups[g].map((t) => (
                        <span key={t} className="rounded-md bg-cream px-1.5 py-0.5 text-xs text-forest-700">{t}</span>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </Section>
            <Section icon={Megaphone} title="Call to action">{post.cta}</Section>

            {isVideo && (
              <Section
                icon={Clapperboard}
                title="Reel script"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg px-2 text-xs text-forest-700"
                    disabled={busy !== null}
                    onClick={() => run("script", async () => { await generateReelScript({ postId: post._id }); }, "Script ready")}
                  >
                    {busy === "script" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    {post.videoScript ? "Rewrite script" : "Write script"}
                  </Button>
                }
              >
                {post.videoScript ? (
                  <div className="space-y-3">
                    <ScriptRow label="Hook (0–3s)">{post.videoScript.hook}</ScriptRow>
                    <ScriptRow label="Scenes">
                      <ol className="list-decimal space-y-1 pl-4">
                        {post.videoScript.scenes.map((s, i) => <li key={i}>{s}</li>)}
                      </ol>
                    </ScriptRow>
                    <ScriptRow label="Ending">{post.videoScript.ending}</ScriptRow>
                    <div className="grid grid-cols-2 gap-3">
                      <ScriptRow label="Music">{post.videoScript.music}</ScriptRow>
                      <ScriptRow label="Length">{post.videoScript.length}</ScriptRow>
                    </div>
                    <ScriptRow label="Text overlays">
                      <ul className="list-disc space-y-1 pl-4">{post.videoScript.textOverlays.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    </ScriptRow>
                    <ScriptRow label="Camera">{post.videoScript.cameraMovement}</ScriptRow>
                    <ScriptRow label="B-roll">
                      <ul className="list-disc space-y-1 pl-4">{post.videoScript.broll.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    </ScriptRow>
                  </div>
                ) : (
                  <p className="text-secondary-text">No script yet — write one with AI.</p>
                )}
              </Section>
            )}

            {post.storyIdeas.length > 0 && (
              <Section icon={Sparkles} title="Story ideas">
                <ul className="list-disc space-y-1 pl-4">{post.storyIdeas.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </Section>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ScriptRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary-text">{label}</p>
      <div className={cn("mt-0.5 text-sm text-ink")}>{children}</div>
    </div>
  );
}
