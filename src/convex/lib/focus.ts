/**
 * Cloudy AI — strategy focus.
 *
 * Two businesses of the same type should never get the same plan. The focus
 * is derived from where the account actually is today (followers, posting
 * consistency, engagement) and shapes the whole 30 days:
 *   awareness  — small or inconsistent accounts: build consistency + educate
 *   community  — mid-sized or regular posters: deepen trust + engagement
 *   conversion — established + engaged accounts: turn attention into sales
 *
 * Type-only imports from ./strategy, so there is no runtime circular
 * dependency (strategy.ts imports this module at runtime).
 */

import type { BusinessProfile, Shot, TypeKB } from "./strategy";

/** Structural match of the seeded RNG returned by makeRng in ./strategy. */
interface Rng {
  next: () => number;
  int: (max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  pickN: <T>(arr: readonly T[], n: number) => T[];
  shuffle: <T>(arr: readonly T[]) => T[];
}

export type StrategyFocus = "awareness" | "community" | "conversion";

export const FOCUS_LABEL: Record<StrategyFocus, string> = {
  awareness: "Build awareness",
  community: "Build community",
  conversion: "Drive conversions",
};

export const strategyFocus = (biz: BusinessProfile): StrategyFocus => {
  const followers = biz.igFollowers ?? "";
  const frequency = biz.postingFrequency ?? "";
  const engagement = biz.engagement ?? "";
  const established = followers === "2kto10k" || followers === "10kplus";
  const small = followers === "under500" || followers === "500to2k";
  const inconsistent = frequency === "rarely" || frequency === "1to2x";
  const quiet = engagement === "low";

  if (established && engagement === "high") return "conversion";
  if (small && (inconsistent || quiet)) return "awareness";
  if (established && (inconsistent || quiet)) return "awareness";
  return "community";
};

/**
 * Days that only appear when the business data calls for them. Keeps the
 * month from looking like the generic pool: small accounts get teaching
 * days, established ones get offer days, everyone with competitors gets a
 * "what makes us different" day.
 */
export const focusTheme = (
  dayIndex: number,
  focus: StrategyFocus,
  kbInfo: TypeKB,
  biz: BusinessProfile,
  rng: Rng,
): { shot: Shot; title: string; goal: string } | null => {
  // "What makes us different" day — still useful even without competitor data.
  if (dayIndex % 10 === 4) {
    return {
      title: `${kbInfo.emoji} What makes us different`,
      goal: "Build trust",
      shot: {
        theme: "What makes us different",
        subject: `the one detail that sets ${biz.businessName} apart`,
        angle: "candid mid shot",
        setting: "in your space during a quiet moment",
        lighting: "natural light",
        background: "your space, softly blurred",
        props: "the thing regulars notice first",
        edit: "bright, warm and authentic",
      },
    };
  }

  if (focus === "awareness" && dayIndex % 4 === 1) {
    const tip = rng.pick(kbInfo.tips);
    return {
      title: tip,
      goal: "Increase followers",
      shot: {
        theme: "Educational tip",
        subject: tip,
        angle: "straight-on or overhead",
        setting: "wherever the tip happens — counter, floor, desk",
        lighting: "bright natural light",
        background: "your space, tidy",
        props: "whatever the tip involves",
        edit: "crisp and readable",
      },
    };
  }

  if (focus === "conversion" && dayIndex % 4 === 2) {
    const offer = rng.pick(kbInfo.offers);
    return {
      title: offer,
      goal: rng.pick(["Get bookings", "Increase sales"]),
      shot: {
        theme: "Offer highlight",
        subject: `${offer.toLowerCase()}`,
        angle: "close-up at a 45° angle",
        setting: "at your counter or front desk",
        lighting: "bright, even light",
        background: "your space",
        props: "a clear sign or menu showing the offer",
        edit: "vibrant and scannable",
      },
    };
  }

  if (focus === "community" && dayIndex % 4 === 3) {
    return {
      title: `${kbInfo.emoji} Behind the scenes`,
      goal: "Build trust",
      shot: {
        theme: "Behind the scenes",
        subject: `the people behind ${biz.businessName}`,
        angle: "candid",
        setting: "during prep or a quiet moment",
        lighting: "natural light",
        background: "your space, mid-motion",
        props: "the tools of the trade",
        edit: "authentic, unfiltered feel",
      },
    };
  }

  return null;
};
