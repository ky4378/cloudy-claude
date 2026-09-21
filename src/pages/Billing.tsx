import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { CheckoutOverlay } from "@/components/pilot/CheckoutOverlay";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router";
import {
  redirectToCheckout,
  useLocalPrices,
} from "@/hooks/use-local-prices";

import { PLAN_META, PLAN_ORDER, PLAN_HIGHLIGHTS, type PlanId } from "@/convex/lib/planLimits";

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
  const [searchParams] = useSearchParams();

  const data = useQuery(api.businesses.myBusiness);
  const billing = useQuery(api.billing.getSubscription);
  const createCheckout = useAction(api.stripe.createCheckout);
  const createPortalSession = useAction(api.stripe.createPortalSession);
  const requestCancellation = useAction(api.stripe.requestCancellation);
  const resumeSubscription = useAction(api.stripe.resumeSubscription);
  const verifyCheckout = useAction(api.stripe.verifyCheckout);
  const { price, currency } = useLocalPrices();

  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncingSubscription, setSyncingSubscription] = useState(false);
  const manualSync = useAction(api.stripe.manualSyncSubscription);

  useEffect(() => {
    if (data === null) {
      window.location.href = "/onboarding";
    }
  }, [data]);

  // Verify checkout and sync subscription immediately (no lag).
  useEffect(() => {
    const outcome = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    if (outcome === "success" && sessionId && !verifying) {
      setVerifying(true);
      verifyCheckout({ sessionId })
        .then((result) => {
          if (result.ok && result.paid) {
            toast.success("Welcome aboard — your subscription is active ✨");
            // Sync subscription immediately in background
            // Don't wait - redirect to plan generation page so subscription can sync while plan generates
            manualSync().catch((err) => {
              console.error("Sync error:", err);
              // Sync will also happen via Stripe webhook and background task during plan generation
            });
            // Redirect to plan page to trigger plan generation
            // Subscription will sync automatically in background during plan generation
            setTimeout(() => {
              window.location.href = "/dashboard/plan";
            }, 300);
          } else if (result.ok && !result.paid) {
            toast.error("Payment not completed. Please try again.");
          } else {
            toast.error("Payment verification failed. Please contact support.");
          }
        })
        .catch((err) => {
          console.error("Checkout verification error:", err);
          toast.error("Couldn't verify your payment. Please try again.");
        })
        .finally(() => {
          setVerifying(false);
        });
    } else if (outcome === "cancelled") {
      toast.info("Checkout cancelled — no charge was made.");
      window.history.replaceState({}, "", "/dashboard/billing");
    }
  }, [searchParams, verifyCheckout, manualSync]);

  const business = data?.business ?? null;
  const posts = data?.posts ?? [];
  const sub = billing?.subscription ?? null;
  const cutoff = billing?.cutoff ?? null;


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

  const handleSyncSubscription = async () => {
    setSyncingSubscription(true);
    try {
      const result = await manualSync();
      if (result.ok) {
        toast.success("✨ Subscription synced! Refreshing...");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(result.message || "Couldn't sync subscription. Please try again.");
      }
    } catch (e) {
      toast.error("Sync failed. Please try again or contact support.");
    } finally {
      setSyncingSubscription(false);
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

  const statusMeta = STATUS_META[sub?.status ?? ""] ?? STATUS_META.canceled;
  const currentPlan = PLANS.find((p) => p.id === sub?.plan);

  return (
    <>
      <GlassBackdrop grid={false} />

      {/* Main content */}
      <main className="px-4 pt-24 pb-16 lg:ml-[330px] lg:px-0 lg:pt-10">
        <div className="flex w-full flex-col gap-8">
          <div className="flex items-center gap-3 lg:-ml-[20rem]">
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

          {/* Plan cards - 3-column grid on desktop, 1 on mobile */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-8 lg:-ml-[20rem]">
            {PLANS.map((p) => {
              const isCurrentPlan = sub?.plan === p.id;
              const planIndex = PLAN_ORDER.indexOf(p.id);
              const currentPlanIndex = sub?.plan ? PLAN_ORDER.indexOf(sub.plan as PlanId) : -1;
              const isUpgrade = currentPlanIndex >= 0 && planIndex > currentPlanIndex;
              const isDowngrade = currentPlanIndex >= 0 && planIndex < currentPlanIndex;

              return (
                <div
                  key={p.id}
                  className={`relative flex flex-1 flex-col rounded-3xl p-8 ${
                    p.popular ? "glass-panel ring-2 ring-ink" : "glass-panel-soft"
                  }`}
                >
                  {p.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3.5 py-1 text-xs font-bold text-white">
                      Most popular
                    </span>
                  )}

                  {/* Plan name */}
                  <div className="mb-4">
                    <h3 className="font-serif text-2xl font-semibold text-ink">
                      {p.name}
                    </h3>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="font-serif text-4xl font-semibold text-ink">
                      {price(p.id)}
                    </span>
                    <span className="text-sm font-medium text-[#8f8b83]">
                      /month
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[#6e6a60] mb-6">{p.blurb}</p>

                  {/* Plan highlights */}
                  <div className="mb-6 flex flex-col gap-3 flex-grow">
                    {PLAN_HIGHLIGHTS[p.id].map((highlight) => (
                      <div key={highlight} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-forest-600 flex-shrink-0" />
                        <span className="text-sm leading-relaxed text-[#6e6a60]">{highlight}</span>
                      </div>
                    ))}
                  </div>

                  {/* Button - pinned to bottom */}
                  <div className="mt-auto">
                    <Button
                      onClick={() => void subscribe(p.id)}
                      disabled={busyPlan !== null || isCurrentPlan}
                      className={`w-full rounded-xl ${
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
                      {isCurrentPlan ? "Current plan" : isUpgrade ? "Upgrade" : "Subscribe"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {!sub && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center lg:-ml-[20rem]">
              <p className="mb-4 text-sm text-amber-900">
                Already paid? If your subscription doesn't appear above, click below to sync it from Stripe.
              </p>
              <Button
                onClick={handleSyncSubscription}
                disabled={syncingSubscription}
                className="rounded-xl"
                variant="outline"
              >
                {syncingSubscription ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 size-4" />
                )}
                Sync my subscription
              </Button>
            </div>
          )}

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#8f8b83] lg:-ml-[20rem]">
            <ShieldCheck className="size-3.5" />
            Auto-renews monthly. Payments are handled securely by Stripe.
          </p>
          {currency !== "USD" && (
            <p className="text-center text-[11px] text-[#a9a49a] lg:-ml-[20rem]">
              Prices shown and charged in {currency}.
            </p>
          )}

          {sub && (
            <>
              {/* Current subscription */}
              <div className="glass-panel rounded-3xl p-6 lg:-ml-[20rem]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">
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
                    <div className="flex flex-col gap-4">
                      <p className="flex items-start gap-2 text-sm leading-relaxed text-[#6e6a60]">
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
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          asChild
                          variant="outline"
                          className="rounded-xl"
                        >
                          <Link to="/dashboard/billing?plan=starter">Subscribe to another plan</Link>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setConfirmingCancel(true)}
                          disabled={cutoff?.withinCutoff ?? false}
                          className="shrink-0 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          Cancel subscription
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust row */}
              <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-hairline bg-cream/40 px-6 py-6 text-center lg:-ml-[20rem]">
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
    </>
  );
}
