/**
 * Cloudy — currency helpers shared by the pricing action (src/convex/currency.ts)
 * and Stripe billing (src/convex/stripe.ts).
 *
 * Prices are defined in USD. When a customer's browser region maps to a
 * currency Stripe can charge in, we convert the USD price to that currency
 * for BOTH display and checkout, so what the user sees is exactly what they
 * pay. Live rates come from the free open.er-api.com endpoint (no key); a
 * static table covers the API being unreachable.
 */

/** Currencies Stripe supports for subscription charges. Everything else falls
 *  back to USD so display and charge never disagree. */
export const SUPPORTED_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "SGD", "AUD", "CAD", "NZD",
  "CHF", "SEK", "NOK", "DKK", "ISK", "PLN", "CZK", "HUF", "RON",
  "JPY", "KRW", "HKD", "TWD", "INR", "IDR", "THB", "VND", "PHP",
  "BRL", "MXN", "ARS", "CLP", "COP", "PEN",
  "AED", "SAR", "QAR", "KWD", "BHD", "OMR", "JOD", "ILS", "TRY", "ZAR",
  "NGN", "PKR", "BDT", "LKR", "EGP", "KES", "GHS",
]);

/** Stripe zero-decimal currencies: amount is not multiplied by 100. */
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF",
  "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

/** Stripe three-decimal currencies: amount is multiplied by 1000. */
const THREE_DECIMAL = new Set(["BHD", "JOD", "KWD", "OMR", "TND"]);

/** Approximate static rates (per 1 USD) — used only if the live API fails. */
const STATIC_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, SGD: 1.35, AUD: 1.52, CAD: 1.37, NZD: 1.65,
  CHF: 0.9, SEK: 10.5, NOK: 10.7, DKK: 6.9, ISK: 138, PLN: 3.95, CZK: 23,
  HUF: 360, RON: 4.6, JPY: 155, KRW: 1380, HKD: 7.8, TWD: 32.5,
  INR: 83, IDR: 16000, THB: 36, VND: 25400, PHP: 56, BRL: 5.4, MXN: 17,
  ARS: 900, CLP: 950, COP: 4000, PEN: 3.7, AED: 3.67, SAR: 3.75, QAR: 3.64,
  KWD: 0.31, BHD: 0.38, OMR: 0.385, JOD: 0.71, ILS: 3.7, TRY: 34, ZAR: 18.2,
  NGN: 1550, PKR: 278, BDT: 117, LKR: 300, EGP: 48, KES: 129, GHS: 15,
};

let cached: { at: number; rates: Record<string, number> } | null = null;

/** Fetch USD→currency rate (units of `currency` per 1 USD). USD → 1. */
export async function usdRate(currency: string): Promise<number | null> {
  const c = (currency || "USD").toUpperCase();
  if (c === "USD") return 1;
  try {
    // Cache the whole table for 12 hours to keep checkout snappy.
    if (!cached || Date.now() - cached.at > 12 * 60 * 60 * 1000) {
      const res = await fetch("https://open.er-api.com/v6/latest/USD", {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          result?: string;
          rates?: Record<string, number>;
        };
        if (data.result === "success" && data.rates) {
          cached = { at: Date.now(), rates: data.rates };
        }
      }
    }
    const rate = cached?.rates[c];
    if (typeof rate === "number" && rate > 0) return rate;
  } catch {
    /* fall through to static table */
  }
  return STATIC_RATES[c] ?? null;
}

/**
 * Convert a USD amount (in dollars, e.g. 20) into Stripe minor units for the
 * given currency. Returns null when the currency isn't supported by Stripe or
 * no rate is available — callers then fall back to USD.
 */
export async function usdToMinor(
  usdAmount: number,
  currency: string,
): Promise<number | null> {
  const c = (currency || "USD").toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(c)) return null;
  const rate = await usdRate(c);
  if (!rate) return null;
  const major = usdAmount * rate;
  if (ZERO_DECIMAL.has(c)) return Math.round(major);
  if (THREE_DECIMAL.has(c)) return Math.round(major * 1000);
  return Math.round(major * 100);
}

/** Convert a USD amount into a display amount (major units) for a currency. */
export async function usdToMajor(
  usdAmount: number,
  currency: string,
): Promise<number | null> {
  const c = (currency || "USD").toUpperCase();
  if (c === "USD") return usdAmount;
  const rate = await usdRate(c);
  if (!rate) return null;
  return Math.round(usdAmount * rate * 100) / 100;
}
