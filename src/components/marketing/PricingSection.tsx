import { Button } from "@/components/ui/button";
import {
  PLAN_HIGHLIGHTS,
  PLAN_META,
  PLAN_ORDER,
  PRICING_ROWS,
  type PlanId,
} from "@/convex/lib/planLimits";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Minus } from "lucide-react";
import { Link } from "react-router";

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto size-4 text-forest-600" />;
  if (value === false) return <Minus className="mx-auto size-4 text-hairline" />;
  return <span className="text-sm text-ink">{value}</span>;
}

export function PricingCards({
  ctaHref = (id: PlanId) => `/signup?plan=${id}`,
  ctaLabel = "Get started",
}: {
  ctaHref?: (id: PlanId) => string;
  ctaLabel?: string;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_ORDER.map((id) => {
        const plan = PLAN_META[id];
        const popular = Boolean(plan.popular);
        return (
          <div
            key={id}
            className={cn(
              "card-surface relative flex flex-col p-7",
              popular && "border-ink ring-1 ring-ink",
            )}
          >
            {popular && (
              <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                Most popular
              </span>
            )}
            <p className="font-serif text-2xl font-medium text-ink">{plan.name}</p>
            <p className="mt-1 text-sm text-secondary-text">{plan.tagline}</p>
            <p className="mt-6 flex items-baseline gap-1">
              <span className="font-serif text-5xl font-medium tracking-tight text-ink">
                ${plan.price}
              </span>
              <span className="text-sm text-secondary-text">/month</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {PLAN_HIGHLIGHTS[id].map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-sm text-ink">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-sage">
                    <Check className="size-3 text-forest-700" />
                  </span>
                  {h}
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant={popular ? "default" : "outline"}
              className="mt-7 w-full rounded-full"
            >
              <Link to={ctaHref(id)}>
                {ctaLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function PricingTable() {
  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-hairline">
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-secondary-text">
              Feature
            </th>
            {PLAN_ORDER.map((id) => (
              <th key={id} className="px-4 py-4 text-center">
                <p className="font-serif text-lg font-medium text-ink">{PLAN_META[id].name}</p>
                <p className="text-xs text-secondary-text">${PLAN_META[id].price}/mo</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PRICING_ROWS.map((row) => (
            <tr
              key={row.label}
              className={cn("border-b border-hairline last:border-0", row.highlight && "bg-sage/50")}
            >
              <td className={cn("px-6 py-3.5 text-sm text-ink", row.highlight && "font-semibold")}>
                {row.label}
              </td>
              {PLAN_ORDER.map((id) => (
                <td
                  key={id}
                  className={cn("px-4 py-3.5 text-center", row.highlight && "font-semibold")}
                >
                  <CellValue value={row.values[id]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
