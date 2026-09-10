import { PilotLogo } from "@/components/pilot/BrandMark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import { BUSINESS_TYPES } from "@/convex/lib/strategy";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
import {
  AlertTriangle,
  CalendarDays,
  CreditCard,
  Heart,
  Images,
  Layers3,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate, NavLink, Outlet, useNavigate } from "react-router";
import { toast } from "sonner";
import { errorMessage, type AppData, type Usage } from "./useAppData";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/plan", label: "30-Day Plan", icon: CalendarDays },
  { to: "/dashboard/content", label: "Content", icon: Layers3 },
  { to: "/dashboard/insights", label: "Insights", icon: Lightbulb },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function CreditMeter({ usage }: { usage: Usage | null | undefined }) {
  if (!usage) return null;
  const pct = usage.credits.limit ? Math.min(100, Math.round((usage.credits.used / usage.credits.limit) * 100)) : 0;
  return (
    <div className="rounded-2xl border border-hairline bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">AI credits</p>
        {usage.isTrial && (
          <span className="rounded-full bg-sage px-2 py-0.5 text-[10px] font-semibold text-forest-700">
            Free trial
          </span>
        )}
      </div>
      <p className="mt-1 font-serif text-xl text-ink">
        {usage.credits.used}
        <span className="text-sm text-secondary-text"> / {usage.credits.limit}</span>
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-cream">
        <div className="h-1.5 rounded-full bg-forest-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-secondary-text">{usage.planName} plan</span>
        <Link to="/billing" className="font-semibold text-forest-700 hover:underline">
          {usage.plan === "pro" ? "Manage" : "Upgrade"}
        </Link>
      </div>
    </div>
  );
}

function SidebarContent({
  data,
  onNavigate,
}: {
  data: AppData;
  onNavigate?: () => void;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const kb = BUSINESS_TYPES.find((b) => b.id === data.business.businessType);
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6">
        <Link to="/dashboard" onClick={onNavigate} aria-label="Cloudy dashboard">
          <PilotLogo />
        </Link>
      </div>
      <nav className="mt-8 flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-text hover:bg-sage hover:text-forest-800",
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}

        <p className="mt-4 px-3 pt-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary-text">
          Workspace
        </p>

        <Link
          to="/coach"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary-text transition-colors hover:bg-sage hover:text-forest-800"
        >
          <MessageCircle className="size-4" />
          AI coach
        </Link>
        <Link
          to="/media"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary-text transition-colors hover:bg-sage hover:text-forest-800"
        >
          <Images className="size-4" />
          Media library
        </Link>
        <Link
          to="/billing"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary-text transition-colors hover:bg-sage hover:text-forest-800"
        >
          <CreditCard className="size-4" />
          Billing
        </Link>
        <Link
          to="/feedback"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary-text transition-colors hover:bg-sage hover:text-forest-800"
        >
          <Heart className="size-4" />
          Give feedback
        </Link>
      </nav>
      <div className="space-y-3 p-4">
        <div className="rounded-2xl border border-hairline bg-white p-4">
          <p className="truncate text-sm font-semibold text-ink">{data.business.businessName}</p>
          <p className="truncate text-xs text-secondary-text">
            {kb ? `${kb.emoji} ${kb.label}` : data.business.businessType} · {data.business.location}
          </p>
          {user?.email && <p className="mt-2 truncate text-xs text-secondary-text">{user.email}</p>}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 -ml-2 h-8 rounded-lg text-secondary-text"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
          >
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlanBanner({ data }: { data: AppData }) {
  const generateStrategy = useAction(api.plan.generateStrategy);
  const [busy, setBusy] = useState(false);
  const status = data.business.planStatus;
  if (status === "generating") {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-forest-200 bg-sage px-4 py-3 text-sm text-forest-800">
        <Loader2 className="size-4 animate-spin" />
        Cloudy is writing your plan… this takes a minute or two. You can keep browsing.
      </div>
    );
  }
  const retry = async () => {
    setBusy(true);
    try {
      await generateStrategy({ businessId: data.business._id });
      toast.success("Your plan is ready.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (status === "error") {
    return (
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-ink sm:flex-row sm:items-center">
        <AlertTriangle className="size-4 shrink-0 text-destructive" />
        <p className="flex-1">{data.business.planError ?? "Plan generation failed."}</p>
        <Button size="sm" className="rounded-full" onClick={retry} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Try again"}
        </Button>
      </div>
    );
  }
  if (data.posts.length === 0) {
    return (
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-hairline bg-white px-5 py-4 sm:flex-row sm:items-center">
        <Sparkles className="size-5 shrink-0 text-forest-600" />
        <div className="flex-1">
          <p className="font-medium text-ink">You don't have a 30-day plan yet.</p>
          <p className="text-sm text-secondary-text">Generate one from your saved answers — it takes a minute or two.</p>
        </div>
        <Button className="rounded-full" onClick={retry} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Generate my plan"}
        </Button>
      </div>
    );
  }
  return null;
}

export default function AppShell() {
  const data = useQuery(api.businesses.myBusiness);
  const usage = useQuery(api.billing.getUsage);
  const [open, setOpen] = useState(false);

  if (data === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="size-6 animate-spin text-secondary-text" />
      </main>
    );
  }
  if (data === null) return <Navigate to="/onboarding" replace />;

  const ctx: AppData = { business: data.business, posts: data.posts, usage };

  return (
    <div className="min-h-screen bg-paper text-ink lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:block lg:h-screen">
        <SidebarContent data={ctx} />
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-hairline bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/dashboard" aria-label="Cloudy dashboard">
          <PilotLogo size="sm" />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <button
            type="button"
            className="glass-chip flex size-10 items-center justify-center"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <SheetContent side="left" className="w-72 bg-sidebar p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent data={ctx} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
          <PlanBanner data={ctx} />
          <Outlet context={ctx} />
        </div>
      </main>
    </div>
  );
}
