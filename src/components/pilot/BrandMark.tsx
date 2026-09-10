import { cn } from "@/lib/utils";

function CloudSVG({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = {
    sm: 28,
    md: 36,
    lg: 44,
  };
  const s = sizeMap[size];

  return (
    <svg
      viewBox="0 0 100 100"
      width={s}
      height={s}
      className="shrink-0"
    >
      <defs>
        <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8f1f9" />
          <stop offset="100%" stopColor="#d0e5f5" />
        </linearGradient>
      </defs>
      <circle cx="35" cy="60" r="20" fill="url(#cloudGradient)" stroke="#8ca8c0" strokeWidth="1.5" />
      <circle cx="50" cy="48" r="23" fill="url(#cloudGradient)" stroke="#8ca8c0" strokeWidth="1.5" />
      <circle cx="65" cy="58" r="20" fill="url(#cloudGradient)" stroke="#8ca8c0" strokeWidth="1.5" />
      <circle cx="42" cy="72" r="18" fill="url(#cloudGradient)" stroke="#8ca8c0" strokeWidth="1.5" />
      <circle cx="58" cy="74" r="16" fill="url(#cloudGradient)" stroke="#8ca8c0" strokeWidth="1.5" />
    </svg>
  );
}

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
        "relative flex shrink-0 items-center justify-center",
        className,
      )}
    >
      <CloudSVG size={size} />
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
