import type { Doc } from "@/convex/_generated/dataModel";
import { PilotLogo } from "@/components/pilot/BrandMark";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Heart,
  Images,
  Inbox,
  LogOut,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Store,
  Sun,
  Zap,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { BUSINESS_TYPES, todayString } from "@/convex/lib/strategy";

type Business = Doc<"businesses">;
type Post = Doc<"posts">;

const daysIntoPlan = (startDate?: string): number => {
  if (!startDate) return 0;
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const today = new Date(`${todayString()}T00:00:00`).getTime();
  return Math.max(0, Math.floor((today - start) / 86400000));
};

export function SidebarContent({
  business,
  posts,
  userName,
  userEmail,
  isAdmin,
  onSignOut,
  onRegenerate,
  regenerating = false,
  remainingRefreshes,
  onNavigate,
}: {
  business: Business;
  posts: Post[];
  userName?: string;
  userEmail?: string;
  isAdmin?: boolean;
  onSignOut: () => void;
  onRegenerate: () => void;
  /** While true, the regenerate button shows spinning arrows + "Regenerating…". */
  regenerating?: boolean;
  /** How many strategy refreshes the user has left this month. */
  remainingRefreshes?: number | null;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const kb = BUSINESS_TYPES.find((b) => b.id === business.businessType);
  const day = daysIntoPlan(business.planStartDate);
  const done = posts.filter((p) => p.status === "done").length;
  const pct = posts.length > 0 ? Math.round((done / posts.length) * 100) : 0;

  // Scroll to a dashboard section. Hash anchors don't reliably scroll inside
  // the Freebuff preview iframe, so we scroll programmatically instead — and
  // from any other page we first navigate to the dashboard with the hash.
  const goToSection = (id: string) => {
    if (location.pathname !== "/dashboard") {
      navigate(`/dashboard#${id}`);
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navButton = (id: string, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => {
        goToSection(id);
        onNavigate?.();
      }}
      className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 pt-6 pb-4">
        <Link to="/" onClick={onNavigate}>
          <PilotLogo light />
        </Link>
      </div>

      <nav className="px-3">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
          Workspace
        </p>
        {navButton("today", "Today", <Sun className="size-4" />)}
        {navButton("calendar", "Content calendar", <CalendarDays className="size-4" />)}
        <Link
          to="/coach"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <MessageCircle className="size-4" />
          AI coach
        </Link>
        <Link
          to="/media"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Images className="size-4" />
          Media library
        </Link>
        <Link
          to="/billing"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <CreditCard className="size-4" />
          Billing
        </Link>
        <Link
          to="/feedback"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Heart className="size-4" />
          Give feedback
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Inbox className="size-4" />
            Feedback inbox
          </Link>
        )}
      </nav>

      {/* Business card */}
      <div className="mt-6 px-4">
        <div className="rounded-2xl border border-hairline bg-white p-4">
          <div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">
                {business.businessName}
              </p>
              <p className="truncate text-xs text-[#8f8b83]">
                {kb?.label ?? "Business"} · {business.location}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#6e6a60]">
                {posts.length > 0 ? `Day ${Math.min(day + 1, 30)} of 30` : "Plan ready"}
              </span>
              <span className="font-semibold text-forest-600">{done}/{posts.length} done</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/5">
              <div
                className="h-full rounded-full bg-forest-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={regenerating}
            className="mt-4 w-full rounded-xl border-hairline bg-white text-xs text-[#6e6a60] hover:bg-cream hover:text-ink"
          >
            <RefreshCw
              className={`mr-1.5 size-3.5 ${regenerating ? "animate-spin" : ""}`}
            />
            {regenerating ? "Regenerating…" : "Regenerate month"}
            {remainingRefreshes != null && (
              <span className="ml-auto text-[10px] font-medium text-[#a9a49a]">
                {remainingRefreshes} left
              </span>
            )}
          </Button>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-forest-200 bg-forest-50 p-3.5">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-forest-600" />
          <p className="text-xs leading-relaxed text-[#6e6a60]">
            Your plan rotates through{" "}
            <span className="font-semibold text-forest-900">
              {business.goals.join(", ").toLowerCase()}
            </span>{" "}
            — every post has a job to do.
          </p>
        </div>
      </div>

      <div className="mt-auto px-4 pb-5 pt-6">
        <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-white p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {userName ?? "Guest"}
            </p>
            <p className="truncate text-xs text-[#8f8b83]">{userEmail}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-[#8f8b83] hover:bg-rose-50 hover:text-rose-500"
            onClick={onSignOut}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/60">
          <Zap className="size-3.5 text-[#9db8a8]" />
          Starter plan · 30-day calendar
        </p>
      </div>
    </div>
  );
}

export function DashboardSidebar(props: React.ComponentProps<typeof SidebarContent>) {
  return (
    <aside className="fixed inset-y-3 left-3 z-30 hidden w-72 overflow-hidden rounded-3xl border border-white/10 bg-sidebar shadow-[0_24px_60px_-30px_rgba(26,26,26,0.45)] lg:block">
      <SidebarContent {...props} />
    </aside>
  );
}
