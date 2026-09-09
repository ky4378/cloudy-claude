import { GeneratingScreen } from "@/components/onboarding/GeneratingScreen";
import { PilotLogo } from "@/components/pilot/BrandMark";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { CheckoutOverlay } from "@/components/pilot/CheckoutOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { BUSINESS_TYPES, GOALS } from "@/convex/lib/strategy";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------

export const TONES = ["Professional", "Luxury", "Funny", "Educational", "Friendly", "Bold"] as const;

export const FOLLOWERS = [
  { id: "under500", label: "Under 500" },
  { id: "500to2k", label: "500 – 2,000" },
  { id: "2kto10k", label: "2,000 – 10,000" },
  { id: "10kplus", label: "10,000+" },
] as const;

export const FREQUENCY = [
  { id: "daily", label: "Daily" },
  { id: "3to4x", label: "3–4× a week" },
  { id: "1to2x", label: "1–2× a week" },
  { id: "rarely", label: "Rarely / just starting" },
] as const;

export const ENGAGEMENT = [
  { id: "high", label: "Very active — comments & DMs" },
  { id: "some", label: "Some engagement" },
  { id: "low", label: "Little engagement" },
] as const;

interface FormState {
  businessName: string;
  businessType: string;
  location: string;
  website: string;
  instagram: string;
  targetCustomers: string;
  mainGoal: string;
  goals: string[];
  igFollowers: string;
  postingFrequency: string;
  engagement: string;
  products: string;
  differentiator: string;
  tone: string;
  contentLikes: string;
  contentDislikes: string;
  competitors: string;
  challenges: string;
}

const EMPTY: FormState = {
  businessName: "",
  businessType: "",
  location: "",
  website: "",
  instagram: "",
  targetCustomers: "",
  mainGoal: "",
  goals: [],
  igFollowers: "",
  postingFrequency: "",
  engagement: "",
  products: "",
  differentiator: "",
  tone: "",
  contentLikes: "",
  contentDislikes: "",
  competitors: "",
  challenges: "",
};

const DRAFT_KEY = "cloudy.onboarding.v2";

const splitList = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

const STEPS = [
  { id: "business", title: "Tell us about your business", blurb: "The basics Cloudy needs to write for you." },
  { id: "audience", title: "Who are you talking to?", blurb: "Your audience and what you want marketing to do." },
  { id: "social", title: "Where is your social media today?", blurb: "This shapes how ambitious the plan should be." },
  { id: "brand", title: "What do you offer, and how should it sound?", blurb: "Your products, your edge and your tone of voice." },
  { id: "content", title: "What content do you want?", blurb: "So Cloudy makes more of what you love and none of what you don't." },
  { id: "review", title: "Here's what Cloudy knows about you", blurb: "Check the details, then generate your plan." },
] as const;

// ---------------------------------------------------------------------------
// Small UI pieces
// ---------------------------------------------------------------------------

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-hairline bg-white text-ink hover:border-forest-300",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  optional,
  recommended,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  recommended?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-ink">
        {label}
        {recommended && <span className="ml-1.5 text-xs font-normal text-secondary-text">Recommended for better results</span>}
        {optional && <span className="ml-1.5 text-xs font-normal text-secondary-text">Optional</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-secondary-text">{hint}</p>}
    </div>
  );
}

const inputClass = "h-11 rounded-xl border-hairline bg-white";
const areaClass = "min-h-24 rounded-xl border-hairline bg-white";

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-hairline py-3 last:border-0 sm:flex-row sm:gap-6">
      <p className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wider text-secondary-text">{label}</p>
      <p className="text-sm text-ink">{value || <span className="text-secondary-text">—</span>}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Onboarding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = params.get("edit") === "1";
  const saveBusiness = useAction(api.plan.saveBusiness);
  const createCheckout = useAction(api.stripe.createCheckout);
  const verifyCheckout = useAction(api.stripe.verifyCheckout);
  const myBusiness = useQuery(api.businesses.myBusiness);
  const usage = useQuery(api.billing.getUsage);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<FormState>) };
    } catch {
      /* ignore corrupted draft */
    }
    return EMPTY;
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "growth" | "pro" | null>(null);
  const prefilled = useRef(false);
  const submitting = useRef(false);
  const pendingFormData = useRef<any>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  // Handle checkout completion
  const checkoutProcessed = useRef(false);
  useEffect(() => {
    // Check URL directly to ensure we catch the checkout=success parameter
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutCompleted = urlParams.get("checkout") === "success";
    const sessionId = urlParams.get("session_id");

    // Restore form data from sessionStorage if needed (page reload during checkout)
    if (!pendingFormData.current) {
      const stored = sessionStorage.getItem("cloudy_pending_form_data");
      if (stored) {
        try {
          pendingFormData.current = JSON.parse(stored);
        } catch {
          /* ignore parse errors */
        }
      }
    }

    // Skip if already processed, missing required data, or no pending form
    if (checkoutProcessed.current || !checkoutCompleted || !sessionId || !pendingFormData.current) return;

    // Mark as processed to avoid duplicate calls
    checkoutProcessed.current = true;

    // User returned from Stripe checkout - verify payment and proceed with generation
    let isMounted = true;

    (async () => {
      try {
        setCheckoutUrl(null);
        setGenerating(true);

        const result = await verifyCheckout({ sessionId });
        if (!isMounted) return;

        if (!result.ok || !result.paid) {
          checkoutProcessed.current = false; // Allow retry
          throw new Error("Payment verification failed. Please try again or contact support.");
        }

        // Payment was successful - proceed with plan generation
        await proceedWithGeneration(pendingFormData.current!);
      } catch (e) {
        if (!isMounted) return;
        const message = e instanceof Error ? e.message : "Failed to process your payment. Please contact support.";
        setError(message);
        toast.error(message);
        setGenerating(false);
        submitting.current = false;
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [params, verifyCheckout]);

  // Prefill from a saved business (returning users / edit mode).
  useEffect(() => {
    if (prefilled.current || !myBusiness?.business) return;
    prefilled.current = true;
    const b = myBusiness.business;
    setForm((f) => {
      if (f.businessName && !editing) return f; // keep a fresher local draft
      return {
        businessName: b.businessName,
        businessType: b.businessType,
        location: b.location,
        website: b.website ?? "",
        instagram: b.instagram ?? "",
        targetCustomers: b.targetCustomers,
        mainGoal: b.mainGoal ?? b.goals[0] ?? "",
        goals: b.goals,
        igFollowers: b.igFollowers ?? "",
        postingFrequency: b.postingFrequency ?? "",
        engagement: b.engagement ?? "",
        products: b.products.join("\n"),
        differentiator: b.differentiator ?? "",
        tone: b.tone ?? b.brandPersonality[0] ?? "",
        contentLikes: b.contentLikes ?? "",
        contentDislikes: b.contentDislikes ?? "",
        competitors: (b.competitors ?? []).join(", "),
        challenges: b.challenges ?? "",
      };
    });
  }, [myBusiness, editing]);

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(form.businessName.trim() && form.businessType && form.location.trim());
      case 1:
        return Boolean(form.targetCustomers.trim() && form.mainGoal);
      case 2:
        return Boolean(form.igFollowers && form.postingFrequency && form.engagement);
      case 3:
        return Boolean(form.products.trim() && form.tone);
      default:
        return true;
    }
  }, [step, form]);

  // Already has a finished plan → straight to the dashboard (unless editing).
  if (
    !editing &&
    !generating &&
    myBusiness?.business &&
    myBusiness.posts.length > 0 &&
    myBusiness.business.planStatus !== "generating" &&
    myBusiness.business.planStatus !== "error"
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  const next = () => {
    if (!stepValid) {
      setTouched(true);
      return;
    }
    setTouched(false);
    setError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const proceedWithGeneration = async (data: any) => {
    try {
      await saveBusiness(data);
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      navigate("/dashboard?welcome=1", { replace: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong generating your plan.";
      setError(message);
      toast.error(message);
      setGenerating(false);
      submitting.current = false;
    }
  };

  const handlePlanSelect = async (plan: "starter" | "growth" | "pro") => {
    setSelectedPlan(plan);
    setError(null);
    try {
      setGenerating(true);
      // Persist form data to sessionStorage in case of page reload during checkout
      if (pendingFormData.current) {
        sessionStorage.setItem("cloudy_pending_form_data", JSON.stringify(pendingFormData.current));
      }
      const result = await createCheckout({
        plan,
        origin: window.location.origin,
        redirectTo: `/onboarding`,
      });
      if (result.url) {
        setCheckoutUrl(result.url);
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to start payment.";
      setError(message);
      toast.error(message);
      setGenerating(false);
    }
  };

  const generate = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);

    // Check if payment is needed (all users without subscription must pay)
    const needsPayment = usage && !usage.hasSubscription;

    if (needsPayment) {
      // Save form data for after payment
      const goals = form.goals.includes(form.mainGoal)
        ? [form.mainGoal, ...form.goals.filter((g) => g !== form.mainGoal)]
        : [form.mainGoal, ...form.goals];
      pendingFormData.current = {
        businessName: form.businessName.trim(),
        businessType: form.businessType,
        location: form.location.trim(),
        website: form.website.trim() || undefined,
        instagram: form.instagram.trim() || undefined,
        targetCustomers: form.targetCustomers.trim(),
        mainGoal: form.mainGoal,
        goals: goals.filter(Boolean),
        igFollowers: form.igFollowers || undefined,
        postingFrequency: form.postingFrequency || undefined,
        engagement: form.engagement || undefined,
        products: splitList(form.products),
        differentiator: form.differentiator.trim() || undefined,
        tone: form.tone || undefined,
        brandPersonality: form.tone ? [form.tone] : [],
        contentLikes: form.contentLikes.trim() || undefined,
        contentDislikes: form.contentDislikes.trim() || undefined,
        competitors: splitList(form.competitors),
        challenges: form.challenges.trim() || undefined,
      };

      // Show plan selection modal instead of going directly to checkout
      setShowPlanSelection(true);
      submitting.current = false;
      return;
    }

    // No payment needed, proceed directly
    setGenerating(true);
    const goals = form.goals.includes(form.mainGoal)
      ? [form.mainGoal, ...form.goals.filter((g) => g !== form.mainGoal)]
      : [form.mainGoal, ...form.goals];
    await proceedWithGeneration({
      businessName: form.businessName.trim(),
      businessType: form.businessType,
      location: form.location.trim(),
      website: form.website.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      targetCustomers: form.targetCustomers.trim(),
      mainGoal: form.mainGoal,
      goals: goals.filter(Boolean),
      igFollowers: form.igFollowers || undefined,
      postingFrequency: form.postingFrequency || undefined,
      engagement: form.engagement || undefined,
      products: splitList(form.products),
      differentiator: form.differentiator.trim() || undefined,
      tone: form.tone || undefined,
      brandPersonality: form.tone ? [form.tone] : [],
      contentLikes: form.contentLikes.trim() || undefined,
      contentDislikes: form.contentDislikes.trim() || undefined,
      competitors: splitList(form.competitors),
      challenges: form.challenges.trim() || undefined,
    });
  };

  const generatingSteps = [
    "Studying your business…",
    `Finding opportunities in ${form.location.trim() || "your area"}…`,
    "Writing your marketing strategy…",
    "Planning 30 days of content…",
    "Writing captions, hooks & hashtags…",
    "Scheduling posting times…",
  ];

  const planNotice =
    usage && usage.hasSubscription && usage.plans.remaining === 0
      ? "You've used all of this month's 30-day plans."
      : usage && !usage.hasSubscription
        ? "You'll complete payment via Stripe after clicking 'Generate my 30-day plan'."
        : null;

  const current = STEPS[step];

  return (
    <div className="relative min-h-screen">
      <GlassBackdrop />
      {generating && <GeneratingScreen steps={generatingSteps} />}
      {checkoutUrl && <CheckoutOverlay url={checkoutUrl} />}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <Link to="/" aria-label="Cloudy home">
          <PilotLogo />
        </Link>
        <p className="text-xs font-medium text-secondary-text">
          Step {step + 1} of {STEPS.length}
        </p>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24">
        {/* Progress */}
        <ol className="mb-8 flex gap-1.5">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-ink" : "bg-hairline",
              )}
            />
          ))}
        </ol>

        <div className="card-surface p-7 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-600">
            {step === STEPS.length - 1 ? "Review" : "Your business"}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-ink md:text-4xl">
            {current.title}
          </h1>
          <p className="mt-2 text-sm text-secondary-text md:text-base">{current.blurb}</p>

          <div className="mt-8 space-y-7">
            {step === 0 && (
              <>
                <Field label="Business name">
                  <Input
                    className={inputClass}
                    value={form.businessName}
                    onChange={(e) => set("businessName", e.target.value)}
                    placeholder="e.g. Corner & Bean"
                    autoFocus
                  />
                </Field>
                <Field label="Business type">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {BUSINESS_TYPES.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => set("businessType", b.id)}
                        aria-pressed={form.businessType === b.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-colors",
                          form.businessType === b.id
                            ? "border-forest-600 bg-sage text-forest-800"
                            : "border-hairline bg-white text-ink hover:border-forest-300",
                        )}
                      >
                        <span className="text-lg">{b.emoji}</span>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Business location" hint="City or neighbourhood — Cloudy uses it for local hashtags and ideas.">
                  <Input
                    className={inputClass}
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="e.g. Portland, Oregon"
                  />
                </Field>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Website" recommended>
                    <Input
                      className={inputClass}
                      value={form.website}
                      onChange={(e) => set("website", e.target.value)}
                      placeholder="yourbusiness.com"
                    />
                  </Field>
                  <Field label="Instagram" recommended>
                    <Input
                      className={inputClass}
                      value={form.instagram}
                      onChange={(e) => set("instagram", e.target.value)}
                      placeholder="@yourbusiness"
                    />
                  </Field>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Target audience" hint="Who do you want to reach? Be as specific as you like.">
                  <Textarea
                    className={areaClass}
                    value={form.targetCustomers}
                    onChange={(e) => set("targetCustomers", e.target.value)}
                    placeholder="e.g. Young professionals and students within 10 minutes of the shop who care about specialty coffee"
                    autoFocus
                  />
                </Field>
                <Field label="Main marketing goal" hint="Pick the one that matters most this month.">
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((g) => (
                      <Chip key={g.id} active={form.mainGoal === g.id} onClick={() => set("mainGoal", g.id)}>
                        {g.emoji} {g.id}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="Other goals" optional>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.filter((g) => g.id !== form.mainGoal).map((g) => {
                      const active = form.goals.includes(g.id);
                      return (
                        <Chip
                          key={g.id}
                          active={active}
                          onClick={() =>
                            set("goals", active ? form.goals.filter((x) => x !== g.id) : [...form.goals, g.id])
                          }
                        >
                          {active && <Check className="mr-1 inline size-3.5" />}
                          {g.id}
                        </Chip>
                      );
                    })}
                  </div>
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="How many followers do you have?">
                  <div className="flex flex-wrap gap-2">
                    {FOLLOWERS.map((o) => (
                      <Chip key={o.id} active={form.igFollowers === o.id} onClick={() => set("igFollowers", o.id)}>
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="How often do you currently post?">
                  <div className="flex flex-wrap gap-2">
                    {FREQUENCY.map((o) => (
                      <Chip key={o.id} active={form.postingFrequency === o.id} onClick={() => set("postingFrequency", o.id)}>
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="How engaged is your audience?">
                  <div className="flex flex-wrap gap-2">
                    {ENGAGEMENT.map((o) => (
                      <Chip key={o.id} active={form.engagement === o.id} onClick={() => set("engagement", o.id)}>
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <Field label="What products or services do you offer?" hint="One per line or comma-separated.">
                  <Textarea
                    className={areaClass}
                    value={form.products}
                    onChange={(e) => set("products", e.target.value)}
                    placeholder={"Signature lattes\nFresh pastries\nSingle-origin beans"}
                    autoFocus
                  />
                </Field>
                <Field label="What makes your business different?" optional>
                  <Textarea
                    className={areaClass}
                    value={form.differentiator}
                    onChange={(e) => set("differentiator", e.target.value)}
                    placeholder="e.g. We roast in-house every morning and know most regulars by name"
                  />
                </Field>
                <Field label="Preferred brand tone" hint="Every caption, hook and script will be written in this voice.">
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <Chip key={t} active={form.tone === t} onClick={() => set("tone", t)}>
                        {t}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {step === 4 && (
              <>
                <Field label="Content you like or want more of" optional>
                  <Textarea
                    className={areaClass}
                    value={form.contentLikes}
                    onChange={(e) => set("contentLikes", e.target.value)}
                    placeholder="e.g. Behind-the-scenes Reels, customer stories, quick tips"
                    autoFocus
                  />
                </Field>
                <Field label="Content you do not want" optional>
                  <Textarea
                    className={areaClass}
                    value={form.contentDislikes}
                    onChange={(e) => set("contentDislikes", e.target.value)}
                    placeholder="e.g. Dancing trends, memes, anything that shows staff faces"
                  />
                </Field>
                <Field label="Main competitors" optional hint="Names or Instagram handles, comma-separated.">
                  <Input
                    className={inputClass}
                    value={form.competitors}
                    onChange={(e) => set("competitors", e.target.value)}
                    placeholder="e.g. Heart Coffee, @stumptowncoffee"
                  />
                </Field>
                <Field label="Your biggest marketing challenges" optional>
                  <Textarea
                    className={areaClass}
                    value={form.challenges}
                    onChange={(e) => set("challenges", e.target.value)}
                    placeholder="e.g. No time to plan, don't know what to film, posts get no engagement"
                  />
                </Field>
              </>
            )}

            {step === 5 && (
              <div className="rounded-2xl border border-hairline bg-paper/60 px-5">
                <Summary label="Business" value={`${form.businessName} · ${BUSINESS_TYPES.find((b) => b.id === form.businessType)?.label ?? ""}`} />
                <Summary label="Location" value={form.location} />
                <Summary label="Audience" value={form.targetCustomers} />
                <Summary label="Main goal" value={form.mainGoal} />
                <Summary label="Social today" value={[FOLLOWERS.find((f) => f.id === form.igFollowers)?.label, FREQUENCY.find((f) => f.id === form.postingFrequency)?.label, ENGAGEMENT.find((f) => f.id === form.engagement)?.label].filter(Boolean).join(" · ")} />
                <Summary label="Offer" value={splitList(form.products).join(", ")} />
                <Summary label="Different because" value={form.differentiator} />
                <Summary label="Tone" value={form.tone} />
                <Summary label="More of" value={form.contentLikes} />
                <Summary label="None of" value={form.contentDislikes} />
                <Summary label="Competitors" value={splitList(form.competitors).join(", ")} />
                <Summary label="Challenges" value={form.challenges} />
              </div>
            )}
          </div>

          {touched && !stepValid && (
            <p className="mt-5 text-sm text-destructive">Please fill in the required fields to continue.</p>
          )}

          {step === STEPS.length - 1 && planNotice && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-hairline bg-cream px-4 py-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-forest-700" />
              <p>
                {planNotice}{" "}
                <Link to="/billing" className="font-semibold text-forest-700 underline-offset-2 hover:underline">
                  View plans
                </Link>
              </p>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p>{error}</p>
            </div>
          )}

          <div className="mt-9 flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" className="rounded-full" onClick={back} disabled={step === 0 || generating}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" className="rounded-full px-6" onClick={next} disabled={!stepValid && touched}>
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="button" className="rounded-full px-6" onClick={generate} disabled={generating}>
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {error ? "Try again" : "Generate my 30-day plan"}
                {!generating && <ArrowRight className="size-4" />}
              </Button>
            )}
          </div>
        </div>

        {showPlanSelection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
                <p className="text-secondary-text mb-8">Select the plan that works best for your business</p>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {(['starter', 'growth', 'pro'] as const).map((planId) => {
                    const plan = {
                      starter: { name: 'Starter', price: 19, features: ['100 AI credits / month', '1 full 30-day marketing plan', 'AI captions, hashtags & Reel ideas', 'Basic Reel scripts, trends & competitors', 'Regenerate individual posts'] },
                      growth: { name: 'Growth', price: 28, features: ['300 AI credits / month', '3 full 30-day marketing plans', 'Advanced Reel scripts, trends & competitors', 'Performance insights', 'Regenerate entire days', 'Priority AI processing'], popular: true },
                      pro: { name: 'Pro', price: 55, features: ['750 AI credits / month', '5 full 30-day marketing plans', 'Full marketing strategy', 'Regenerate entire weeks', 'Priority AI processing', 'Early access to new features'] },
                    }[planId];

                    return (
                      <div
                        key={planId}
                        className={cn(
                          'border-2 rounded-xl p-6 cursor-pointer transition-all',
                          plan.popular ? 'border-forest-500 bg-forest-50' : 'border-hairline hover:border-forest-300',
                          selectedPlan === planId ? 'ring-2 ring-primary' : ''
                        )}
                        onClick={() => handlePlanSelect(planId)}
                      >
                        {plan.popular && <div className="text-xs font-bold text-forest-600 mb-2 uppercase">Most Popular</div>}
                        <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                        <div className="mb-4">
                          <span className="text-3xl font-bold">${plan.price}</span>
                          <span className="text-secondary-text ml-2">/month</span>
                        </div>
                        <button
                          disabled={generating && selectedPlan === planId}
                          className="w-full bg-primary text-white py-2 rounded-lg font-medium mb-6 hover:opacity-90 disabled:opacity-50"
                        >
                          {generating && selectedPlan === planId ? 'Processing...' : 'Select Plan'}
                        </button>
                        <ul className="space-y-3">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="text-sm text-secondary-text flex items-start gap-2">
                              <Check className="size-4 text-forest-500 mt-0.5 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setShowPlanSelection(false);
                    submitting.current = false;
                  }}
                  className="w-full text-secondary-text hover:text-ink py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
