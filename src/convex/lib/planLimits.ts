/**
 * Cloudy — plan catalog & limits.
 *
 * Single source of truth for what each subscription tier includes. The
 * landing-page pricing table, the billing page and the server-side usage
 * guards all read from here so they can never disagree.
 *
 * Every numeric limit is a monthly cap. Usage is tracked on the subscription
 * row and auto-resets when a new billing period starts.
 */

export type PlanId = "starter" | "growth" | "pro";

export type Depth = "basic" | "advanced" | "full";
export type RegenerationScope = "post" | "day" | "week";

export interface PlanLimits {
  /** AI credits per month — every AI action costs credits (see CREDIT_COSTS). */
  credits: number;
  /** Full 30-day marketing plans per month. */
  plans: number;
  reelScripts: Depth;
  trendInsights: Depth;
  /** The largest unit of the plan that can be regenerated in one go. */
  regeneration: RegenerationScope;
  performanceInsights: boolean;
  marketingStrategy: Depth;
  priorityProcessing: boolean;
  earlyAccess: boolean;
  /** AI coach messages per month. */
  coachMessages: number;
}

export interface PlanMeta {
  id: PlanId;
  name: string;
  /** USD per month. */
  price: number;
  tagline: string;
  popular?: boolean;
}

export const PLAN_META: Record<PlanId, PlanMeta> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 19,
    tagline: "For one business getting consistent.",
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: 28,
    tagline: "For owners ready to grow faster.",
    popular: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 55,
    tagline: "For serious operators and multi-location brands.",
  },
};

export const PLAN_ORDER: PlanId[] = ["starter", "growth", "pro"];

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  starter: {
    credits: 100,
    plans: 1,
    reelScripts: "basic",
    trendInsights: "basic",
    regeneration: "post",
    performanceInsights: false,
    marketingStrategy: "basic",
    priorityProcessing: false,
    earlyAccess: false,
    coachMessages: 10,
  },
  growth: {
    credits: 300,
    plans: 3,
    reelScripts: "advanced",
    trendInsights: "advanced",
    regeneration: "day",
    performanceInsights: true,
    marketingStrategy: "advanced",
    priorityProcessing: true,
    earlyAccess: false,
    coachMessages: 20,
  },
  pro: {
    credits: 750,
    plans: 5,
    reelScripts: "advanced",
    trendInsights: "advanced",
    regeneration: "week",
    performanceInsights: true,
    marketingStrategy: "full",
    priorityProcessing: true,
    earlyAccess: true,
    coachMessages: 40,
  },
};

/** Every AI action and what it costs in credits. */
export type UsageFeature =
  | "plans"
  | "strategy"
  | "regenerations"
  | "captions"
  | "hashtags"
  | "reelIdeas"
  | "reelScripts"
  | "trendAnalysis"
  | "recommendations"
  | "coachMessages";

export const CREDIT_COSTS: Record<UsageFeature, number> = {
  plans: 30, // strategy + full 30-day plan
  strategy: 5, // refresh the marketing strategy on its own
  regenerations: 2, // one post; a day costs the same, a week costs 7×
  captions: 1,
  hashtags: 1,
  reelIdeas: 2,
  reelScripts: 2,
  trendAnalysis: 5,
  recommendations: 3,
  coachMessages: 1,
};

export const USAGE_FEATURES: UsageFeature[] = [
  "plans",
  "strategy",
  "regenerations",
  "captions",
  "hashtags",
  "reelIdeas",
  "reelScripts",
  "trendAnalysis",
  "recommendations",
  "coachMessages",
];

export const FEATURE_LABEL: Record<UsageFeature, string> = {
  plans: "30-day plans",
  strategy: "Strategy refreshes",
  regenerations: "Content regenerations",
  captions: "AI captions",
  hashtags: "AI hashtags",
  reelIdeas: "Reel ideas",
  reelScripts: "Reel scripts",
  trendAnalysis: "Trend analyses",
  recommendations: "Recommendation refreshes",
  coachMessages: "Coach messages",
};

/** Rows of the pricing comparison table (landing page + billing page). */
export interface PricingRow {
  label: string;
  values: Record<PlanId, string | boolean>;
  highlight?: boolean;
}

export const PRICING_ROWS: PricingRow[] = [
  {
    label: "AI credits",
    highlight: true,
    values: { starter: "100 / month", growth: "300 / month", pro: "750 / month" },
  },
  {
    label: "30-day marketing plans",
    values: { starter: "1 / month", growth: "3 / month", pro: "5 / month" },
  },
  {
    label: "AI coach messages",
    values: { starter: "10 / month", growth: "20 / month", pro: "40 / month" },
  },
  { label: "Instagram content planning", values: { starter: true, growth: true, pro: true } },
  { label: "AI captions", values: { starter: true, growth: true, pro: true } },
  { label: "AI hashtags", values: { starter: true, growth: true, pro: true } },
  { label: "Reel ideas", values: { starter: true, growth: true, pro: true } },
  { label: "Reel scripts", values: { starter: "Basic", growth: "Advanced", pro: "Advanced" } },
  { label: "Trend insights", values: { starter: "Basic", growth: "Advanced", pro: "Advanced" } },
  {
    label: "Content regeneration",
    values: { starter: "Individual posts", growth: "Entire days", pro: "Entire weeks" },
  },
  { label: "Performance insights", values: { starter: false, growth: true, pro: true } },
  { label: "Marketing strategy", values: { starter: "Basic", growth: "Advanced", pro: "Full" } },
  { label: "Personalized recommendations", values: { starter: true, growth: true, pro: true } },
  { label: "Priority AI processing", values: { starter: false, growth: true, pro: true } },
  { label: "Early access to new features", values: { starter: false, growth: false, pro: true } },
];

/** Short bullet list shown on each pricing card. */
export const PLAN_HIGHLIGHTS: Record<PlanId, string[]> = {
  starter: [
    "100 AI credits / month",
    "1 full 30-day marketing plan",
    "10 AI coach messages / month",
    "AI captions, hashtags & Reel ideas",
    "Basic Reel scripts & trend insights",
    "Regenerate individual posts",
  ],
  growth: [
    "300 AI credits / month",
    "3 full 30-day marketing plans",
    "20 AI coach messages / month",
    "Advanced Reel scripts & trend insights",
    "Performance insights",
    "Regenerate entire days",
    "Priority AI processing",
  ],
  pro: [
    "750 AI credits / month",
    "5 full 30-day marketing plans",
    "40 AI coach messages / month",
    "Full marketing strategy",
    "Regenerate entire weeks",
    "Priority AI processing",
    "Early access to new features",
  ],
};

/** Resolve a plan name string (from DB) to a PlanId, defaulting to starter. */
export function toPlanId(raw?: string | null): PlanId {
  if (raw === "growth" || raw === "pro") return raw;
  return "starter";
}

/** Return the limits for a plan, defaulting to starter if unknown. */
export function getLimitsFor(raw?: string | null): PlanLimits {
  return PLAN_LIMITS[toPlanId(raw)];
}

/** How many days a single regeneration may cover on this plan. */
export function regenerationDays(raw?: string | null): number {
  const scope = getLimitsFor(raw).regeneration;
  return scope === "week" ? 7 : 1;
}
