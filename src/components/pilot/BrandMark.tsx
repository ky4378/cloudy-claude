import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl bg-ink text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
        size === "sm" && "h-7 w-7 rounded-lg",
        size === "md" && "h-9 w-9",
        size === "lg" && "h-11 w-11",
        className,
      )}
    >
      <Sparkles
        className={cn(
          size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-6 w-6",
        )}
        strokeWidth={2.2}
      />
    </div>
  );
}

export function PilotLogo({
  size = "md",
  light = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  /** Render the wordmark in white for dark surfaces like the sidebar. */
  light?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-serif font-semibold tracking-tight",
        light ? "text-white" : "text-foreground",
        size === "sm" && "text-xl",
        size === "md" && "text-2xl",
        size === "lg" && "text-3xl",
        className,
      )}
    >
      Cloudy{" "}
      <span
        className={cn(
          "font-bold",
          light ? "text-gradient-sage" : "text-gradient-blue",
        )}
      >
        ✦
      </span>
    </span>
  );
}
