import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Images,
  KeyRound,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

type Kind = "logo" | "photo";

const MAX_BYTES = 8 * 1024 * 1024;

export default function Media() {

  const data = useQuery(api.businesses.myBusiness);
  const mediaData = useQuery(api.businessMedia.myMedia);
  const supabaseStatus = useQuery(api.supabaseStatus.status);
  const uploadImage = useAction(api.supabase.uploadImage);
  const deleteImage = useAction(api.supabase.deleteImage);
  const regenerateCalendar = useAction(api.plan.regenerateCalendar);

  const [selected, setSelected] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("photo");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [setupNeededState, setSetupNeeded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data === null) {
      window.location.href = "/onboarding";
    }
  }, [data]);

  const business = data?.business ?? null;
  const posts = data?.posts ?? [];
  const media = mediaData?.media ?? [];
  const businessId = mediaData?.businessId ?? business?._id ?? null;
  // Show the "add your keys" banner right away when Supabase isn't configured
  // (or after a failed upload as a fallback).
  const setupNeeded =
    setupNeededState ||
    (supabaseStatus !== undefined && supabaseStatus.configured === false);


  const handleRegenerate = async () => {
    if (!business) return;
    try {
      await regenerateCalendar({ businessId: business._id });
      toast.success("Fresh 30-day plan generated ✨");
    } catch {
      toast.error("Couldn't regenerate the plan. Try again.");
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, WebP…).");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Images must be 8 MB or smaller.");
      return;
    }
    setSelected(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const clearSelection = () => {
    setSelected(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!selected || !businessId || uploading) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result ?? "");
          resolve(result.includes(",") ? result.split(",")[1] : result);
        };
        reader.onerror = () => reject(new Error("Couldn't read file"));
        reader.readAsDataURL(selected);
      });

      const result = (await uploadImage({
        kind,
        fileName: selected.name,
        mimeType: selected.type,
        base64,
      })) as { ok: boolean; url?: string; error?: string };

      if (!result.ok) {
        if (result.error?.includes("isn't configured")) setSetupNeeded(true);
        toast.error(result.error ?? "Upload failed. Try again.");
        return;
      }
      toast.success(
        kind === "logo" ? "Logo uploaded 🖼️" : "Photo added to your library 📸",
      );
      clearSelection();
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: Id<"businessMedia">) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const result = (await deleteImage({ mediaId: id })) as {
        ok: boolean;
        error?: string;
      };
      if (!result.ok) {
        toast.error(result.error ?? "Couldn't delete. Try again.");
        return;
      }
      toast.success("Removed from your library");
    } catch {
      toast.error("Couldn't delete. Try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (data === undefined || mediaData === undefined) {
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
        <div className="mx-auto flex max-w-4xl flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-forest-600 text-white shadow-sm">
              <Images className="size-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                Media library
              </h1>
              <p className="text-sm text-[#6e6a60]">
                Your logo and real photos of {business.businessName} — stored
                securely so the AI can build content around them.
              </p>
            </div>
          </div>

          {setupNeeded && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <h2 className="font-serif text-lg font-semibold tracking-tight text-amber-900">
                    Connect Supabase to enable uploads
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-amber-800">
                    Open the{" "}
                    <span className="font-semibold">
                      Keys / API keys
                    </span>{" "}
                    tab in Freebuff and add two environment variables from your
                    Supabase project (Settings → API):
                  </p>
                  <code className="mt-3 inline-block rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900">
                    SUPABASE_URL = https://xxxx.supabase.co
                  </code>
                  <br />
                  <code className="mt-2 inline-block rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900">
                    SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOi…
                  </code>
                  <p className="mt-3 text-xs text-amber-700">
                    Once saved, try uploading again.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Uploader */}
          <section className="glass-panel rounded-3xl p-6 sm:p-7">
            <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">
              Add media
            </h2>
            <p className="mt-1 text-sm text-[#6e6a60]">
              Upload your logo and the photos you&apos;d actually post — the
              plan and AI coach can reference them later.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {!selected ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-5 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-hairline bg-cream/40 px-6 py-10 text-center transition-colors hover:border-forest-300 hover:bg-forest-50/40"
              >
                <UploadCloud className="size-7 text-forest-500" />
                <span className="text-sm font-semibold text-ink">
                  Choose an image
                </span>
                <span className="text-xs text-[#8f8b83]">
                  JPG, PNG or WebP · up to 8 MB
                </span>
              </button>
            ) : (
              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-white">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {selected.name}
                  </p>
                  <p className="text-xs text-[#8f8b83]">
                    {(selected.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {(["logo", "photo"] as Kind[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                          kind === k
                            ? "bg-forest-600 text-white"
                            : "border border-hairline bg-white text-[#6e6a60] hover:border-forest-300"
                        }`}
                      >
                        {k === "logo" ? "Logo" : "Photo"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => void handleUpload()}
                    disabled={uploading}
                    className="rounded-xl"
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <UploadCloud className="mr-2 size-4" />
                    )}
                    Upload
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSelection}
                    className="rounded-xl text-[#8f8b83] hover:text-rose-500"
                    aria-label="Cancel"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Grid */}
          <section className="glass-panel rounded-3xl p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">
                Your library
              </h2>
              <span className="text-xs font-semibold text-[#8f8b83]">
                {media.length} {media.length === 1 ? "item" : "items"}
              </span>
            </div>

            {media.length === 0 ? (
              <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-hairline bg-cream/40 px-6 py-12 text-center">
                <ImageIcon className="size-6 text-forest-400" />
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6e6a60]">
                  Nothing here yet — upload your logo or a few photos above.
                  They&apos;ll be stored in your private media library.
                </p>
              </div>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {media.map((m) => (
                  <li
                    key={m.id}
                    className="group relative overflow-hidden rounded-2xl border border-hairline bg-white"
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={m.url}
                        alt={m.fileName}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <span
                      className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
                        m.kind === "logo" ? "bg-ink/80" : "bg-forest-600/80"
                      }`}
                    >
                      {m.kind === "logo" ? "Logo" : "Photo"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(m.id)}
                      disabled={deletingId === m.id}
                      className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-[#6e6a60] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100 disabled:opacity-100"
                      aria-label="Delete image"
                    >
                      {deletingId === m.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#8f8b83]">
            <RefreshCw className="size-3" />
            Files are stored in Supabase Storage and shown only to you.
          </p>
        </div>
      </main>
    </>
  );
}
