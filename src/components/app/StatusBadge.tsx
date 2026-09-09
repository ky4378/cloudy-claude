import { cn } from "@/lib/utils";
import { STATUS_META } from "./useAppData";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.planned;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
