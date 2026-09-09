/**
 * Warm, editorial backdrop shared by every page.
 * Paper-toned background with faint sage glows, fixed behind content.
 */
export function GlassBackdrop({ grid = true }: { grid?: boolean }) {
  return (
    <div
      aria-hidden
      className="pilot-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {grid && (
        <div className="pilot-grid absolute inset-x-0 top-0 h-[760px]" />
      )}
      <div className="absolute -top-40 right-[-12%] h-[460px] w-[460px] rounded-full bg-forest-300/20 blur-[120px]" />
      <div className="absolute top-[38%] left-[-14%] h-[420px] w-[420px] rounded-full bg-forest-400/15 blur-[120px]" />
      <div className="absolute bottom-[-12%] right-[16%] h-[400px] w-[400px] rounded-full bg-forest-200/25 blur-[120px]" />
    </div>
  );
}
