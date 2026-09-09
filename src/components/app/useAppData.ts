import type { Doc } from "@/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { useOutletContext } from "react-router";

export type Business = Omit<Doc<"businesses">, "igToken">;
export type Post = Doc<"posts">;
export type Usage = NonNullable<FunctionReturnType<typeof api.billing.getUsage>>;

export interface AppData {
  business: Business;
  posts: Post[];
  usage: Usage | null | undefined;
}

/** Data loaded once by AppShell and shared with every dashboard page. */
export function useAppData(): AppData {
  return useOutletContext<AppData>();
}

export const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  planned: { label: "Ready", className: "bg-sage text-forest-700" },
  done: { label: "Posted", className: "bg-primary text-primary-foreground" },
  skipped: { label: "Skipped", className: "bg-cream text-secondary-text" },
};

export const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export const relativeTime = (ts: number) => {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
};

export const allHashtags = (post: Post) => [
  ...post.hashtagGroups.local,
  ...post.hashtagGroups.industry,
  ...post.hashtagGroups.trending,
  ...post.hashtagGroups.branded,
];

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const errorMessage = (e: unknown, fallback = "Something went wrong.") =>
  e instanceof Error && e.message ? e.message : fallback;
