import { LegalLayout } from "@/components/pilot/LegalLayout";

const EXCLUSIONS = [
  "Change of mind after purchase",
  "Accidental purchases",
  "Failure to use the service",
  "Lack of usage or dissatisfaction with the service",
  "Failure to cancel a subscription before a renewal",
  "Technical difficulties or interruptions",
  "Changes in personal circumstances",
  "Duplicate purchases",
  "Failure to access or use features included with the purchase",
];

export default function Refunds() {
  return (
    <LegalLayout title="Refund Policy" updated="August 17, 2026">
      <p className="text-sm leading-relaxed text-[#4a473f]">
        All purchases made through Cloudy are{" "}
        <span className="font-semibold text-ink">
          final and non-refundable
        </span>
        .
      </p>
      <p className="mt-4 text-sm leading-relaxed text-[#4a473f]">
        By purchasing or subscribing to any Cloudy product or service, you
        acknowledge and agree that{" "}
        <span className="font-semibold text-ink">
          no refunds, credits, reimbursements, or cancellations of completed
          payments will be provided under any circumstances
        </span>
        , including but not limited to:
      </p>
      <ul className="mt-4 list-disc space-y-1.5 pl-5">
        {EXCLUSIONS.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-[#4a473f]">
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-[#4a473f]">
        Cloudy does not provide refunds on completed purchases or subscription
        payments.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-[#4a473f]">
        If you choose to cancel a subscription, the cancellation will prevent
        future renewal charges where applicable, but{" "}
        <span className="font-semibold text-ink">
          does not entitle you to a refund for any payment that has already
          been processed
        </span>
        .
      </p>
      <p className="mt-4 text-sm leading-relaxed text-[#4a473f]">
        By completing a purchase, you confirm that you have read, understood,
        and agreed to this Refund Policy.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-[#4a473f]">
        Cloudy reserves the right to update this policy at any time. Any
        changes will be posted on this page.
      </p>
    </LegalLayout>
  );
}
