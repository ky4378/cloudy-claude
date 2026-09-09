import { ExternalLink, Loader2 } from "lucide-react";

/**
 * Full-screen overlay shown while Stripe checkout is opening. The redirect is
 * usually instant, but inside the Freebuff preview iframe Stripe's hosted page
 * can be slow or blocked — so we keep this on screen with a manual
 * "open checkout page" link until navigation actually happens.
 */
export function CheckoutOverlay({ url }: { url: string | null }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-cream/85 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-3xl border border-hairline bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-forest-50">
          <Loader2 className="size-6 animate-spin text-forest-600" />
        </div>
        <h3 className="mt-4 font-serif text-lg font-semibold text-ink">
          Opening secure checkout…
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[#6e6a60]">
          You&apos;ll be redirected to Stripe to pay securely. This can take a
          few seconds.
        </p>
        {url ? (
          <>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              <ExternalLink className="size-4" />
              Open checkout page
            </a>
            <p className="mt-2 text-xs text-[#8f8b83]">
              If the page doesn&apos;t open automatically, tap the button above.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
