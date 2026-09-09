import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  Captions,
  Check,
  CheckCircle2,
  Clapperboard,
  Copy,
  Hash,
  Instagram,
  ListChecks,
  Music2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { CONTENT_TYPE_META } from "@/convex/lib/strategy";

type Post = Doc<"posts">;

const PLATFORM_ICON = { Instagram } as const;

const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

export function PostDetailSheet({
  post,
  open,
  onOpenChange,
  onToggleStatus,
  onRegenerate,
}: {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleStatus: (postId: string, status: "planned" | "done") => void;
  onRegenerate: (postId: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const CopyBlock = ({
    label,
    text,
    icon,
    isRich = false,
  }: {
    label: string;
    text: string;
    icon: React.ReactNode;
    isRich?: boolean;
  }) => (
    <div className="rounded-2xl border border-hairline bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#8f8b83]">
          {icon}
          {label}
        </span>
        <button
          onClick={() => copy(label, text)}
          className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-2.5 py-1 text-[11px] font-semibold text-forest-800 transition-colors hover:bg-forest-200"
        >
          {copied === label ? (
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
      <p
        className={`mt-2.5 whitespace-pre-line text-sm leading-relaxed text-[#4a473f] ${
          isRich ? "" : "font-medium"
        }`}
      >
        {text}
      </p>
    </div>
  );

  const hashtagList = post
    ? [
        ...post.hashtagGroups.local,
        ...post.hashtagGroups.industry,
        ...post.hashtagGroups.trending,
        ...post.hashtagGroups.branded,
      ]
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l border-hairline bg-white p-0 sm:max-w-[560px]"
      >
        {post && (
          <>
            <SheetHeader className="border-b border-hairline bg-white px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SheetTitle className="font-serif text-lg text-ink">
                      {post.title}
                    </SheetTitle>
                  </div>
                  <SheetDescription className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#4a473f]">
                      {shortDate(post.date)}
                    </span>
                    <span className="text-[#a9a49a]">·</span>
                    <span>Day {post.dayIndex + 1} of 30</span>
                  </SheetDescription>
                </div>
                <button
                  onClick={() =>
                    onToggleStatus(
                      post._id,
                      post.status === "done" ? "planned" : "done",
                    )
                  }
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    post.status === "done"
                      ? "bg-forest-600 text-white"
                      : "border border-hairline bg-white text-[#6e6a60] hover:text-ink"
                  }`}
                >
                  {post.status === "done" ? (
                    <>
                      <CheckCircle2 className="size-4" /> Posted
                    </>
                  ) : (
                    <>
                      <Check className="size-4" /> Mark done
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-100 px-2.5 py-1 text-xs font-semibold text-forest-800">
                  {(() => {
                    const Icon = PLATFORM_ICON[post.platform] ?? Instagram;
                    return <Icon className="size-3.5" />;
                  })()}
                  {post.platform}
                </span>
                <span className="rounded-md bg-ink px-2 py-0.5 text-[11px] font-bold text-white">
                  {CONTENT_TYPE_META[post.contentType].label.toUpperCase()}
                </span>
                <Badge className="rounded-full bg-cream text-[#6e6a60] hover:bg-cream">
                  {post.goal}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 rounded-full px-2.5 text-xs text-[#8f8b83] hover:text-forest-700"
                  onClick={() => onRegenerate(post._id)}
                >
                  <RefreshCw className="mr-1 size-3.5" />
                  Re-roll
                </Button>
              </div>
            </SheetHeader>

            <div className="px-6 py-5">
              <Tabs defaultValue="create" className="w-full">
                <TabsList className="h-10 w-full rounded-xl border border-hairline bg-cream/60 p-1">
                  <TabsTrigger value="create" className="gap-1.5 rounded-lg text-xs">
                    <Camera className="size-4" /> Create
                  </TabsTrigger>
                  <TabsTrigger value="captions" className="gap-1.5 rounded-lg text-xs">
                    <Captions className="size-4" /> Captions
                  </TabsTrigger>
                  <TabsTrigger value="hashtags" className="gap-1.5 rounded-lg text-xs">
                    <Hash className="size-4" /> Hashtags
                  </TabsTrigger>
                  {post.videoScript && (
                    <TabsTrigger value="script" className="gap-1.5 rounded-lg text-xs">
                      <Clapperboard className="size-4" /> Script
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="create" className="mt-4 space-y-3">
                  <CopyBlock
                    label="Photo instructions"
                    icon={<Camera className="size-3.5" />}
                    text={post.photoInstructions}
                  />
                  <CopyBlock
                    label="Story ideas"
                    icon={<Sparkles className="size-3.5" />}
                    text={post.storyIdeas.map((s) => `• ${s}`).join("\n")}
                  />
                  <div className="rounded-2xl border border-forest-200 bg-forest-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-forest-700">
                      Pro tip
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#4a473f]">
                      Film or photograph this in natural light before the busy
                      hours. Batch three days of content in one session — the
                      prompts are designed so they shoot fast.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="captions" className="mt-4 space-y-3">
                  <CopyBlock
                    label="Short caption"
                    icon={<Captions className="size-3.5" />}
                    text={post.captionShort}
                  />
                  <CopyBlock
                    label="Long caption"
                    icon={<Captions className="size-3.5" />}
                    text={post.captionLong}
                    isRich
                  />
                  <CopyBlock
                    label="Call to action"
                    icon={<Sparkles className="size-3.5" />}
                    text={post.cta}
                  />
                </TabsContent>

                <TabsContent value="hashtags" className="mt-4 space-y-3">
                  {[
                    { label: "Local", tags: post.hashtagGroups.local },
                    { label: "Industry", tags: post.hashtagGroups.industry },
                    { label: "Trending", tags: post.hashtagGroups.trending },
                    { label: "Branded", tags: post.hashtagGroups.branded },
                  ].map((group) => (
                    <div key={group.label} className="rounded-2xl border border-hairline bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8f8b83]">
                        {group.label}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {group.tags.map((h) => (
                          <span
                            key={h}
                            className="rounded-full bg-forest-100 px-2.5 py-1 text-xs font-medium text-forest-800"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <CopyBlock
                    label="All hashtags"
                    icon={<Hash className="size-3.5" />}
                    text={hashtagList.join(" ")}
                  />
                </TabsContent>

                {post.videoScript && (
                  <TabsContent value="script" className="mt-4 space-y-3">
                    <CopyBlock
                      label="Hook (first 3 seconds)"
                      icon={<Clapperboard className="size-3.5" />}
                      text={post.videoScript.hook}
                    />
                    {post.videoScript.scenes.map((scene, i) => (
                      <CopyBlock
                        key={i}
                        label={`Scene ${i + 1}`}
                        icon={<ListChecks className="size-3.5" />}
                        text={scene}
                      />
                    ))}
                    <CopyBlock
                      label="Ending"
                      icon={<CheckCircle2 className="size-3.5" />}
                      text={post.videoScript.ending}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CopyBlock
                        label="Music"
                        icon={<Music2 className="size-3.5" />}
                        text={post.videoScript.music}
                      />
                      <CopyBlock
                        label="Length"
                        icon={<Clapperboard className="size-3.5" />}
                        text={post.videoScript.length}
                      />
                    </div>
                    <CopyBlock
                      label="Text overlays"
                      icon={<Sparkles className="size-3.5" />}
                      text={post.videoScript.textOverlays.join("\n")}
                    />
                    <CopyBlock
                      label="Camera movement"
                      icon={<Camera className="size-3.5" />}
                      text={post.videoScript.cameraMovement}
                    />
                    <CopyBlock
                      label="B-roll ideas"
                      icon={<Sparkles className="size-3.5" />}
                      text={post.videoScript.broll.map((b) => `• ${b}`).join("\n")}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
