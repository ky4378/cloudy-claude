import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo, useState } from "react";

type Pricing = {
  currency: string;
  chargeable: boolean;
  rate: number;
  plans: { starter: number; growth: number; pro: number };
  plansMinor: { starter: number; growth: number; pro: number };
};

type PlanId = "starter" | "growth" | "pro";

/**
 * Navigate to a Stripe checkout/portal URL, surviving the Freebuff preview
 * iframe. Stripe's hosted checkout page refuses to render inside an iframe
 * (X-Frame-Options), which shows a blank white screen — so when we're framed
 * we navigate the top window instead. If that's blocked too, the caller's
 * overlay keeps a manual "open checkout page" link as fallback.
 */
export function redirectToCheckout(url: string): void {
  try {
    const top = window.top;
    if (top && top !== window.self) {
      top.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch {
    /* top navigation blocked — the overlay keeps a manual link */
  }
}

/** ISO country code → currency for the common cases. Unknown → USD. */
const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", NZ: "NZD", SG: "SGD", MY: "MYR",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", PT: "EUR",
  IE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR", SK: "EUR", SI: "EUR", EE: "EUR",
  LU: "EUR", MT: "EUR", CY: "EUR", HR: "EUR",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", IS: "ISK", PL: "PLN", CZ: "CZK",
  HU: "HUF", RO: "RON",
  JP: "JPY", KR: "KRW", CN: "CNY", HK: "HKD", TW: "TWD", IN: "INR", ID: "IDR",
  TH: "THB", VN: "VND", PH: "PHP",
  BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR", JO: "JOD",
  IL: "ILS", TR: "TRY", ZA: "ZAR",
  NG: "NGN", PK: "PKR", BD: "BDT", LK: "LKR", EG: "EGP", KE: "KES", GH: "GHS",
};

/** Best guess at the visitor's currency from their browser locale/region. */
export function detectCurrency(): string {
  // Currencies Stripe supports
  const SUPPORTED = new Set([
    "USD", "EUR", "GBP", "SGD", "AUD", "CAD", "NZD",
    "CHF", "SEK", "NOK", "DKK", "ISK", "PLN", "CZK", "HUF", "RON",
    "JPY", "KRW", "HKD", "TWD", "INR", "IDR", "THB", "VND", "PHP",
    "BRL", "MXN", "ARS", "CLP", "COP", "PEN",
    "AED", "SAR", "QAR", "KWD", "BHD", "OMR", "JOD", "ILS", "TRY", "ZAR",
    "NGN", "PKR", "BDT", "LKR", "EGP", "KES", "GHS",
  ]);

  try {
    const lang = navigator.language || navigator.languages?.[0] || "en-US";
    const region = new Intl.Locale(lang).maximize().region;
    if (region && COUNTRY_CURRENCY[region]) {
      const currency = COUNTRY_CURRENCY[region];
      if (SUPPORTED.has(currency)) return currency;
      // Fall back to EUR for European regions with unsupported currencies
      if (["BG", "HR", "CY", "MT"].includes(region)) return "EUR";
    }
  } catch {
    /* fall through to USD */
  }
  return "USD";
}

/**
 * Local-currency pricing for the three plans, for display on the pricing
 * page. Returns:
 * - `price(id)` — the plan price formatted in the detected currency
 *   (falls back to USD formatting while the rate loads or on failure)
 * - `currency` — the currency code currently displayed
 *
 * Note: checkout amounts are handled by Stripe's own localized pricing —
 * Stripe detects the customer's region and presents the order summary in
 * their local currency, so the total they see is the total they pay.
 */
export function useLocalPrices() {
  const getPricing = useAction(api.currency.getLocalPricing);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const currency = useMemo(() => detectCurrency(), []);

  useEffect(() => {
    let live = true;
    getPricing({ currency })
      .then((p) => {
        if (live) setPricing(p as Pricing);
      })
      .catch(() => {
        /* keep USD fallback */
      });
    return () => {
      live = false;
    };
  }, [currency, getPricing]);

  const fmt = (amount: number): string =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: pricing?.currency ?? "USD",
    }).format(amount);

  const price = (id: PlanId): string =>
    fmt(
      pricing?.plans[id] ??
        (id === "starter" ? 19 : id === "growth" ? 28 : 55),
    );

  return {
    pricing,
    price,
    currency: pricing?.currency ?? "USD",
  };
}
