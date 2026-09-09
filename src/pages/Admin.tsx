import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useAction, useQuery } from "convex/react";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import {
  DashboardSidebar,
  SidebarContent,
} from "@/components/pilot/Sidebar";
import { PilotLogo } from "@/components/pilot/BrandMark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  BarChart3,
  Inbox,
  KeyRound,
  Loader2,
  Lock,
  Menu,
  MessageSquareHeart,
  RefreshCw,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

type Report =
  | {
      authorized: false;
      reason: "not_configured" | "not_signed_in" | "not_admin";
    }
  | {
      authorized: true;
      submissions: {
        id: string;
        rating: number;
        whatWorks: string | null;
        improve: string | null;
        createdAt: number;
        businessName: string;
        location: string | null;
        email: string | null;
      }[];
      summary: {
        count: number;
        averageRating: number | null;
        distribution: Record<number, number>;
        positivePct: number | null;
      };
    };

const RATING_EMOJI = ["", "😞", "😕", "🙂", "😊", "🤩"];

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function Admin() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const data = useQuery(api.businesses.myBusiness);
  const getReport = useAction(api.admin.getFeedbackReport);
  const regenerateCalendar = useAction(api.plan.regenerateCalendar);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = (await getReport()) as Report;
      setReport(result);
    } catch {
      toast.error("Couldn't load the feedback inbox. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data === null) {
      navigate("/onboarding", { replace: true });
    }
  }, [data, navigate]);

  const business = data?.business ?? null;
  const posts = data?.posts ?? [];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleRegenerate = async () => {
    if (!business) return;
    try {
      await regenerateCalendar({ businessId: business._id });
      toast.success("Fresh 30-day plan generated ✨");
    } catch {
      toast.error("Couldn't regenerate the plan. Try again.");
    }
  };

  if (data === undefined) {
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

  const sidebarProps = {
    business,
    posts,
    userName: user?.name,
    userEmail: user?.email,
    isAdmin: user?.role === "admin",
    onSignOut: handleSignOut,
    onRegenerate: handleRegenerate,
  };

  const summary = report?.authorized ? report.summary : null;
  const submissions = report?.authorized ? report.submissions : [];

  return (
    <div className="min-h-screen">
      <GlassBackdrop grid={false} />

      {/* Desktop sidebar */}
      <DashboardSidebar {...sidebarProps} />

      {/* Mobile top bar */}
      <header className="glass-nav fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between px-4 lg:hidden">
        <PilotLogo size="sm" />
        <button
          onClick={() => setMobileNavOpen(true)}
          className="glass-chip flex h-10 w-10 items-center justify-center rounded-xl"
          aria-label="Open menu"
        >
          {mobileNavOpen ? (
            <X className="size-5" />
          ) : (
            <Menu className="size-5" />
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-80 border-r border-hairline bg-white p-0"
        >
          <SidebarContent
            {...sidebarProps}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="px-4 pt-24 pb-16 lg:pl-[330px] lg:pr-6 lg:pt-10">
        <div className="mx-auto flex max-w-4xl flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-forest-600 text-white shadow-sm">
              <Inbox className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                Feedback inbox
              </h1>
              <p className="text-sm text-[#6e6a60]">
                Everything your users told you — ratings, praise, and the
                things to fix.
              </p>
            </div>
            {report?.authorized && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void load()}
                className="rounded-xl"
              >
                <RefreshCw
                  className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            )}
          </div>

          {loading && report === null ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-hairline bg-cream/40 px-6 py-16 text-center">
              <Loader2 className="size-6 animate-spin text-forest-500" />
              <p className="text-sm text-[#6e6a60]">Loading feedback…</p>
            </div>
          ) : !report?.authorized ? (
            <section className="glass-panel rounded-3xl p-8 sm:p-10">
              {report?.reason === "not_configured" ? (
                <div className="flex flex-col items-center text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <KeyRound className="size-6" />
                  </div>
                  <h2 className="mt-4 font-serif text-xl font-semibold tracking-tight text-ink">
                    This page is locked until you add yourself as admin
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-[#6e6a60]">
                    Open the{" "}
                    <span className="font-semibold text-ink">
                      Keys / API keys
                    </span>{" "}
                    tab in Freebuff and add an environment variable:
                  </p>
                  <code className="mt-4 rounded-xl border border-hairline bg-white px-4 py-2 text-sm font-semibold text-forest-700">
                    ADMIN_EMAILS = your@email.com
                  </code>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#6e6a60]">
                    Use the email you sign in to Cloudy with. You can list
                    several, comma-separated. Once saved, hit Refresh.
                  </p>
                  <Button
                    onClick={() => void load()}
                    className="mt-5 rounded-xl"
                  >
                    <RefreshCw className="mr-2 size-4" />
                    I&apos;ve added it — check again
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                    <Lock className="size-6" />
                  </div>
                  <h2 className="mt-4 font-serif text-xl font-semibold tracking-tight text-ink">
                    Admins only
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6e6a60]">
                    Your account isn&apos;t on the admin list, so the feedback
                    inbox stays private.
                  </p>
                </div>
              )}
            </section>
          ) : (
            <>
              {/* Summary */}
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="glass-panel rounded-3xl p-5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8f8b83]">
                    <MessageSquareHeart className="size-3.5" />
                    Submissions
                  </p>
                  <p className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">
                    {summary?.count ?? 0}
                  </p>
                </div>
                <div className="glass-panel rounded-3xl p-5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8f8b83]">
                    <BarChart3 className="size-3.5" />
                    Average rating
                  </p>
                  <p className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">
                    {summary?.averageRating == null
                      ? "—"
                      : `${summary.averageRating.toFixed(1)} / 5`}
                  </p>
                </div>
                <div className="glass-panel rounded-3xl p-5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8f8b83]">
                    <ShieldCheck className="size-3.5" />
                    Happy users
                  </p>
                  <p className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">
                    {summary?.positivePct == null
                      ? "—"
                      : `${summary.positivePct}%`}
                  </p>
                </div>
              </section>

              {/* Distribution */}
              {summary && summary.count > 0 && (
                <section className="glass-panel rounded-3xl p-6">
                  <h2 className="font-serif text-lg font-semibold tracking-tight text-ink">
                    Rating breakdown
                  </h2>
                  <div className="mt-4 flex flex-col gap-2.5">
                    {[5, 4, 3, 2, 1].map((r) => {
                      const n = summary.distribution[r] ?? 0;
                      const pct =
                        summary.count > 0 ? (n / summary.count) * 100 : 0;
                      return (
                        <div key={r} className="flex items-center gap-3">
                          <span className="w-8 shrink-0 text-sm font-semibold text-[#6e6a60]">
                            {RATING_EMOJI[r]}
                          </span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream">
                            <div
                              className="h-full rounded-full bg-forest-500 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 shrink-0 text-right text-sm font-medium text-[#8f8b83]">
                            {n}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Submissions */}
              <section className="glass-panel rounded-3xl p-6 sm:p-7">
                <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">
                  Submissions
                </h2>
                {submissions.length === 0 ? (
                  <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-hairline bg-cream/40 px-6 py-12 text-center">
                    <Inbox className="size-6 text-forest-400" />
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6e6a60]">
                      No feedback yet. It starts flowing in a day after each
                      user signs up, then monthly.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-4 flex flex-col gap-3">
                    {submissions.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-2xl border border-hairline bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-9 items-center justify-center rounded-xl bg-forest-50 text-lg">
                              {RATING_EMOJI[s.rating] ?? "🙂"}
                            </span>
                            <div>
                              <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                                <Store className="size-3.5 text-forest-600" />
                                {s.businessName}
                              </p>
                              <p className="text-xs text-[#8f8b83]">
                                {[s.location, s.email]
                                  .filter(Boolean)
                                  .join(" · ") || "Unknown owner"}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-[#8f8b83]">
                            {formatDate(s.createdAt)}
                          </span>
                        </div>
                        {s.whatWorks && (
                          <p className="mt-3 text-sm leading-relaxed text-[#4a473f]">
                            <span className="font-semibold text-forest-700">
                              Working well:
                            </span>{" "}
                            {s.whatWorks}
                          </p>
                        )}
                        {s.improve && (
                          <p className="mt-1.5 text-sm leading-relaxed text-[#4a473f]">
                            <span className="font-semibold text-ink">
                              Improve:
                            </span>{" "}
                            {s.improve}
                          </p>
                        )}
                        {!s.whatWorks && !s.improve && (
                          <p className="mt-3 text-sm italic text-[#8f8b83]">
                            {s.rating >= 4
                              ? "Happy with Cloudy ✨"
                              : "Had a rough week — noted, and thank you for telling us."}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
