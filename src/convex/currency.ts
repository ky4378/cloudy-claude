/**
 * Cloudy — local-currency pricing.
 *
 * Returns the three plan prices converted from USD into the customer's
 * currency, plus whether that currency is one Stripe can actually charge in.
 * When the currency is unsupported (or rates are unavailable) it falls back
 * to USD so the displayed price always matches what checkout charges.
 */

"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import {
  SUPPORTED_CURRENCIES,
  usdRate,
  usdToMajor,
  usdToMinor,
} from "./lib/fx";

export const getLocalPricing = action({
  args: { currency: v.string() },
  handler: async (_ctx, { currency }): Promise<{
    currency: string;
    chargeable: boolean;
    rate: number;
    plans: { starter: number; growth: number; pro: number };
    plansMinor: { starter: number; growth: number; pro: number };
  }> => {
    const c = (currency || "USD").toUpperCase();
    if (c !== "USD" && SUPPORTED_CURRENCIES.has(c)) {
      const [starter, growth, pro, starterMinor, growthMinor, proMinor, rate] =
        await Promise.all([
          usdToMajor(19, c),
          usdToMajor(28, c),
          usdToMajor(55, c),
          usdToMinor(19, c),
          usdToMinor(28, c),
          usdToMinor(55, c),
          usdRate(c),
        ]);
      if (
        starter !== null &&
        growth !== null &&
        pro !== null &&
        starterMinor !== null &&
        growthMinor !== null &&
        proMinor !== null &&
        rate !== null
      ) {
        return {
          currency: c,
          chargeable: true,
          rate,
          plans: { starter, growth, pro },
          plansMinor: { starter: starterMinor, growth: growthMinor, pro: proMinor },
        };
      }
    }
    // Unsupported currency or unavailable rate → show + charge in USD.
    return {
      currency: "USD",
      chargeable: true,
      rate: 1,
      plans: { starter: 19, growth: 28, pro: 55 },
      plansMinor: { starter: 1900, growth: 2800, pro: 5500 },
    };
  },
});
