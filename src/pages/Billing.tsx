import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useAction, useQuery } from "convex/react";
import { CheckoutOverlay } from "@/components/pilot/CheckoutOverlay";
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
  BadgeCheck,
  CalendarClock,
  CreditCard,
  ExternalLink,
  Loader2,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  redirectToCheckout,
  useLocalPrices,
} from "@/hooks/use-local-prices";

import { PLAN_META, PLAN_ORDER, type PlanId } from "@/convex/lib/planLimits";

/** Derived from the shared plan catalog so prices can never drift. */
const PLANS: {
  id: PlanId;
  name: string;
  price: number;
  blurb: string;
  popular?: boolean;
}[] = PLAN_ORDER.map((id) => ({
  id,
  name: PLAN_META[id].name,
  price: PLAN_META[id].price,
  blurb: PLAN_META[id].tagline,
  popular: PLAN_META[id].popular,
}));

const PLAN_EMOJI: Record<PlanId, string> = {
  starter: "🌱",
  growth: "📈",
  pro: "🚀",
};

const fmtDate = (ts: number | null | undefined): string =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-forest-100 text-forest-800" },
  trialing: { label: "Trial", cls: "bg-forest-100 text-forest-800" },
  past_due: { label: "Payment past due", cls: "bg-[#f7f0d8] text-[#7a6118]" },
  unpaid: { label: "Payment failed", cls: "bg-[#f7f0d8] text-[#7a6118]" },
  incomplete: { label: "Incomplete", cls: "bg-[#f7f0d8] text-[#7a6118]" },
  canceled: { label: "Canceled", cls: "bg-cream text-[#6e6a60]" },
};

export default function Billing() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const data = useQuery(api.businesses.myBusiness);
  const billing = useQuery(api.billing.getSubscription);
  const createCheckout = useAction(api.stripe.createCheckout);
  const createPortalSession = useAction(api.stripe.createPortalSession);
  const requestCancellation = useAction(api.stripe.requestCancellation);
  const resumeSubscription = useAction(api.stripe.resumeSubscription);
  const { price, currency } = useLocalPrices();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);

  useEffect(() => {
    if (data === null) {
      navigate("/onboarding", { replace: true });
    }
  }, [data, navigate]);

  // Toast the checkout outcome once.
  useEffect(() => {
    const outcome = searchParams.get("checkout");
    if (outcome === "success") {
      toast.success("Welcome aboard — your subscription is active ✨");
      window.history.replaceState({}, "", "/billing");
    } else if (outcome === "cancelled") {
      toast.info("Checkout cancelled — no charge was made.");
      window.history.replaceState({}, "", "/billing");
    }
  }, [searchParams]);

  const business = data?.business ?? null;
  const posts = data?.posts ?? [];
  const sub = billing?.subscription ?? null;
  const cutoff = billing?.cutoff ?? null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const subscribe = async (plan: PlanId) => {
    if (busyPlan) return;
    setBusyPlan(plan);
    setCheckoutUrl(null);
    try {
      const { url } = await createCheckout({
        plan,
        origin: window.location.origin,
      });
      if (!url) {
        setBusyPlan(null);
        toast.error("Couldn't start checkout. Try again.");
        return;
      }
      setCheckoutUrl(url);
      redirectToCheckout(url);
    } catch {
      setBusyPlan(null);
      toast.error("Couldn't start checkout. Try again.");
    }
  };

  const openPortal = async () => {
    if (portalBusy) return;
    setPortalBusy(true);
    setCheckoutUrl(null);
    try {
      const { url } = await createPortalSession({
        origin: window.location.origin,
      });
      if (!url) {
        setPortalBusy(false);
        toast.error("Couldn't open billing portal.");
        return;
      }
      setCheckoutUrl(url);
      redirectToCheckout(url);
    } catch {
      setPortalBusy(false);
      toast.error("Couldn't open billing portal.");
    }
  };

  const cancel = async () => {
    if (cancelBusy) return;
    setCancelBusy(true);
    try {
      const res = (await requestCancellation()) as {
        ok: boolean;
        reason?: string;
        renewsOn?: number | null;
        cancelAvailableOn?: number | null;
        already?: boolean;
        endsOn?: number | null;
      };
      if (!res.ok && res.reason === "tooLate") {
        toast.error(
          `It's too late to cancel for next month — the charge on ${fmtDate(res.renewsOn)} already applies. You can cancel for the following month after ${fmtDate(res.cancelAvailableOn)}.`,
        );
      } else {
        toast.success(
          res.already
            ? "Your subscription is already set to cancel."
            : `Subscription canceled — no charge after ${fmtDate(
                res.endsOn ?? cutoff?.renewsOn,
              )}.`,
        );
      }
    } catch {
      toast.error("Couldn't cancel right now. Try again.");
    } finally {
      setCancelBusy(false);
      setConfirmingCancel(false);
    }
  };

  const resume = async () => {
    if (resumeBusy) return;
    setResumeBusy(true);
    try {
      const res = (await resumeSubscription()) as { ok: boolean };
      if (res.ok) toast.success("Subscription resumed — you're all set.");
      else toast.error("Couldn't resume right now.");
    } catch {
      toast.error("Couldn't resume right now.");
    } finally {
      setResumeBusy(false);
    }
  };

  if (data === undefined || billing === undefined) {
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
    onRegenerate: () => {},
  };

  const statusMeta = STATUS_META[sub?.status ?? ""] ?? STATUS_META.canceled;
  const currentPlan = PLANS.find((p) => p.id === sub?.plan);

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
          {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
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
              <CreditCard className="size-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                Billing
              </h1>
              <p className="text-sm text-[#6e6a60]">
                Your plan renews automatically every month. Cancel anytime up
                to 2 days before your renewal date.
              </p>
            </div>
          </div>

          {!sub ? (
            <>
              {/* Plan cards */}
              <div className="grid gap-5 md:grid-cols-3">
                {PLANS.map((p) => (
                  <div
                    key={p.id}
                    className={`relative flex flex-col rounded-3xl p-6 ${
                      p.popular ? "glass-panel ring-2 ring-ink" : "glass-panel-soft"
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3.5 py-1 text-xs font-bold text-white">
                        Most popular
                      </span>
                    )}
                    <span className="text-2xl">{PLAN_EMOJI[p.id]}</span>
                    <h3 className="mt-2 font-serif text-lg font-semibold text-ink">
                      {p.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#8f8b83]">{p.blurb}</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-serif text-3xl font-semibold text-ink">
                        {price(p.id)}
                      </span>
                      <span className="text-sm font-medium text-[#8f8b83]">
                        /month
                      </span>
                    </div>
                    <Button
                      onClick={() => void subscribe(p.id)}
                      disabled={busyPlan !== null}
                      className={`mt-6 w-full rounded-xl ${
                        p.popular
                          ? ""
                          : "bg-white text-ink ring-1 ring-hairline hover:bg-cream"
                      }`}
                    >
                      {busyPlan === p.id ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 size-4" />
                      )}
                      Subscribe
                    </Button>
                  </div>
                ))}
              </div>

              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#8f8b83]">
                <ShieldCheck className="size-3.5" />
                Auto-renews monthly. Payments are handled securely by Stripe.
              </p>
              {currency !== "USD" && (
                <p className="text-center text-[11px] text-[#a9a49a]">
                  Prices shown and charged in {currency}.
                </p>
              )}
            </>
          ) : (
            <>
              {/* Current subscription */}
              <div className="glass-panel rounded-3xl p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">
                        {PLAN_EMOJI[(sub.plan as PlanId) ?? "starter"]}{" "}
                        {currentPlan?.name ?? sub.plan}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusMeta.cls}`}
                      >
                        {statusMeta.label}
                      </span>
                      {sub.cancelAtPeriodEnd && (
                        <span className="rounded-full bg-[#f7f0d8] px-2.5 py-0.5 text-[11px] font-bold text-[#7a6118]">
                          Cancels at period end
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[#6e6a60]">
                      {currentPlan ? price(currentPlan.id) : "—"}/month ·{" "}
                      {sub.cancelAtPeriodEnd
                        ? `Access until ${fmtDate(
                            cutoff?.renewsOn ?? sub.currentPeriodEnd,
                          )}`
                        : `Next charge: ${fmtDate(
                            cutoff?.renewsOn ?? sub.currentPeriodEnd,
                          )}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={openPortal}
                    disabled={portalBusy}
                    className="shrink-0 rounded-xl"
                  >
                    {portalBusy ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 size-4" />
                    )}
                    Manage card & invoices
                  </Button>
                </div>

                <div className="mt-5 border-t border-hairline pt-5">
                  {sub.cancelAtPeriodEnd ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-md text-sm leading-relaxed text-[#6e6a60]">
                        Your subscription is set to end on{" "}
                        <span className="font-semibold text-ink">
                          {fmtDate(cutoff?.renewsOn ?? sub.currentPeriodEnd)}
                        </span>
                        . You won&apos;t be charged again. Changed your mind?
                      </p>
                      <Button
                        onClick={resume}
                        disabled={resumeBusy}
                        className="shrink-0 rounded-xl"
                      >
                        {resumeBusy && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Resume subscription
                      </Button>
                    </div>
                  ) : confirmingCancel ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-md text-sm leading-relaxed text-[#6e6a60]">
                        Confirm cancellation — you&apos;ll keep access until{" "}
                        <span className="font-semibold text-ink">
                          {fmtDate(cutoff?.renewsOn ?? sub.currentPeriodEnd)}
                        </span>{" "}
                        and won&apos;t be charged after.
                      </p>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setConfirmingCancel(false)}
                          className="rounded-xl"
                        >
                          Keep my plan
                        </Button>
                        <Button
                          onClick={() => void cancel()}
                          disabled={cancelBusy}
                          className="rounded-xl bg-rose-600 hover:bg-rose-700"
                        >
                          {cancelBusy && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          )}
                          Confirm cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="flex max-w-md items-start gap-2 text-sm leading-relaxed text-[#6e6a60]">
                        <CalendarClock className="mt-0.5 size-4 shrink-0 text-forest-600" />
                        {cutoff?.withinCutoff && cutoff.renewsOn ? (
                          <>
                            The next charge on{" "}
                            <span className="font-semibold text-ink">
                              {fmtDate(cutoff.renewsOn)}
                            </span>{" "}
                            already applies — you can cancel for the following
                            month after that date.
                          </>
                        ) : (
                          <>
                            Cancel before{" "}
                            <span className="font-semibold text-ink">
                              {cutoff?.renewsOn
                                ? fmtDate(cutoff.renewsOn - 2 * 86400000)
                                : "—"}
                            </span>{" "}
                            and you won&apos;t be charged for next month.
                          </>
                        )}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setConfirmingCancel(true)}
                        disabled={cutoff?.withinCutoff ?? false}
                        className="shrink-0 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        Cancel subscription
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust row */}
              <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-hairline bg-cream/40 px-6 py-6 text-center">
                <BadgeCheck className="size-5 text-forest-500" />
                <p className="max-w-md text-xs leading-relaxed text-[#6e6a60]">
                  Payments are processed securely by Stripe. You can update
                  your card, download invoices and see payment history from the
                  billing portal at any time.
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      {(busyPlan !== null || portalBusy) && (
        <CheckoutOverlay url={checkoutUrl} />
      )}
    </div>
  );
}
