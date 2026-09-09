import { PostDetailSheet } from "@/components/app/PostDetailSheet";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card, EmptyState, PageHeader } from "@/components/app/PageHeader";
import { allHashtags, copyText, errorMessage, shortDate, useAppData, type Post } from "@/components/app/useAppData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { CONTENT_TYPE_META, type ContentType, type VideoScript } from "@/convex/lib/strategy";
import { cn } from "@/lib/utils";
import { useAction } from "convex/react";
import { Clapperboard, Copy, Hash, Loader2, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const TABS: { id: "All" | ContentType; label: string }[] = [
  { id: "All", label: "All" },
  { id: "Reel", label: "Reels" },
  { id: "Carousel", label: "Carousels" },
  { id: "Photo Post", label: "Photos" },
  { id: "Story Post", label: "Stories" },
];

interface ReelIdea {
  title: string;
  hook: string;
  concept: string;
  format: string;
  whyItWorks: string;
}

const scriptToText = (s: VideoScript) =>
  [
    `HOOK: ${s.hook}`,
    "",
    ...s.scenes,
    "",
    `ENDING: ${s.ending}`,
    `MUSIC: ${s.music}`,
    `LENGTH: ${s.length}`,
    `TEXT OVERLAYS: ${s.textOverlays.join(" | ")}`,
    `CAMERA: ${s.cameraMovement}`,
    `B-ROLL: ${s.broll.join(", ")}`,
  ].join("\n");

export default function ContentPage() {
  const { business, posts } = useAppData();
  const generateReelIdeas = useAction(api.ai.generateReelIdeas);
  const generateReelScript = useAction(api.ai.generateReelScript);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("All");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Post | null>(null);
  const [ideas, setIdeas] = useState<ReelIdea[]>([]);
  const [ideasBusy, setIdeasBusy] = useState(false);
  const [scriptBusy, setScriptBusy] = useState<string | null>(null);
  const [script, setScript] = useState<{ idea: string; script: VideoScript } | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter(
      (p) =>
        (tab === "All" || p.contentType === tab || (tab === "Reel" && p.contentType === "Video Post")) &&
        (!needle || `${p.title} ${p.subject} ${p.captionLong} ${p.goal}`.toLowerCase().includes(needle)),
    );
  }, [posts, tab, q]);

  const loadIdeas = async () => {
    setIdeasBusy(true);
    try {
      const res = await generateReelIdeas({ businessId: business._id, count: 5 });
      setIdeas(res.ideas);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setIdeasBusy(false);
    }
  };

  const writeScript = async (idea: ReelIdea) => {
    setScriptBusy(idea.title);
    try {
      const res = await generateReelScript({ businessId: business._id, idea: `${idea.title} — ${idea.concept}`, hook: idea.hook });
      setScript({ idea: idea.title, script: res.videoScript });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setScriptBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Content" description="Every post in your plan, ready to copy — plus fresh Reel ideas whenever you need them." />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {TABS.map((t) => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold", tab === t.id ? "bg-ink text-white" : "border border-hairline bg-white text-secondary-text hover:border-forest-300")}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-text" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content" className="h-10 rounded-full border-hairline bg-white pl-9" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Nothing here yet" description={posts.length ? "Try a different filter or search." : "Generate your plan to fill your content library."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((p) => (
                <button key={p._id} type="button" onClick={() => setSelected(p)} className="card-surface flex flex-col p-5 text-left transition-colors hover:border-forest-300">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-sage px-2.5 py-1 text-[11px] font-semibold text-forest-700">{CONTENT_TYPE_META[p.contentType].emoji} {CONTENT_TYPE_META[p.contentType].label}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-3 font-serif text-lg font-medium leading-tight text-ink">{p.title}</p>
                  <p className="mt-1 text-xs italic text-secondary-text line-clamp-2">“{p.hook ?? p.videoScript?.hook ?? p.subject}”</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink line-clamp-3">{p.captionLong}</p>
                  <div className="mt-4 flex items-center gap-3 text-[11px] text-secondary-text">
                    <span>{shortDate(p.date)}</span>
                    {p.time && <span>· {p.time}</span>}
                    <span className="ml-auto inline-flex items-center gap-1"><Hash className="size-3" />{allHashtags(p).length}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Card eyebrow="Reel ideas" title="Fresh ideas to film" actions={
          <Button size="sm" className="rounded-full" onClick={loadIdeas} disabled={ideasBusy}>
            {ideasBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {ideas.length ? "More ideas" : "Generate Reel ideas"}
          </Button>
        }>
          {ideas.length === 0 ? (
            <EmptyState icon={<Clapperboard className="size-5" />} title="No ideas generated yet" description="Get 5 filmable Reel concepts personalized to your business." />
          ) : (
            <ul className="space-y-3">
              {ideas.map((idea) => (
                <li key={idea.title} className="rounded-2xl border border-hairline bg-white p-4">
                  <p className="font-serif text-lg font-medium leading-tight text-ink">{idea.title}</p>
                  <p className="mt-1 text-sm italic text-forest-700">“{idea.hook}”</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink">{idea.concept}</p>
                  <p className="mt-2 text-xs leading-relaxed text-secondary-text"><span className="font-semibold">Why it works:</span> {idea.whyItWorks}</p>
                  <Button size="sm" variant="outline" className="mt-3 rounded-full" disabled={scriptBusy !== null} onClick={() => writeScript(idea)}>
                    {scriptBusy === idea.title ? <Loader2 className="size-3.5 animate-spin" /> : <Clapperboard className="size-3.5" />}
                    Write script
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <PostDetailSheet post={selected ? posts.find((p) => p._id === selected._id) ?? selected : null} open={selected !== null} onOpenChange={(o) => !o && setSelected(null)} />

      <Dialog open={script !== null} onOpenChange={(o) => !o && setScript(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-xl">
          {script && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl font-medium">{script.idea}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p><span className="font-semibold">Hook:</span> {script.script.hook}</p>
                <ol className="list-decimal space-y-1 pl-5">{script.script.scenes.map((s, i) => <li key={i}>{s}</li>)}</ol>
                <p><span className="font-semibold">Ending:</span> {script.script.ending}</p>
                <p><span className="font-semibold">Music:</span> {script.script.music} · <span className="font-semibold">Length:</span> {script.script.length}</p>
                <p><span className="font-semibold">Text overlays:</span> {script.script.textOverlays.join(" · ")}</p>
                <p><span className="font-semibold">Camera:</span> {script.script.cameraMovement}</p>
                <p><span className="font-semibold">B-roll:</span> {script.script.broll.join(", ")}</p>
              </div>
              <Button className="rounded-full" onClick={async () => { (await copyText(scriptToText(script.script))) ? toast.success("Script copied") : toast.error("Couldn't copy"); }}>
                <Copy className="size-4" /> Copy script
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
