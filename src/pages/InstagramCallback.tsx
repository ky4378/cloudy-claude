import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import { Button } from "@/components/ui/button";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

type Status =
  | { phase: "working" }
  | { phase: "success"; username: string }
  | { phase: "error"; message: string };

const STATE_KEY = "contentpilot_ig_oauth_state";

export default function InstagramCallback() {
  const [searchParams] = useSearchParams();
  const connect = useAction(api.instagram.connectInstagram);
  const [status, setStatus] = useState<Status>({ phase: "working" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const saved = sessionStorage.getItem(STATE_KEY);
      sessionStorage.removeItem(STATE_KEY);

      if (!code) {
        setStatus({
          phase: "error",
          message: "Instagram didn't return an authorization code.",
        });
        return;
      }
      if (!state || state !== saved) {
        setStatus({
          phase: "error",
          message: "Security check failed — this connection was cancelled. Try again from your dashboard.",
        });
        return;
      }

      const redirectUri = `${window.location.origin}/ig/callback`;
      try {
        const result = await connect({ code, redirectUri });
        if (!cancelled) {
          setStatus({ phase: "success", username: result.username });
        }
      } catch (e) {
        if (!cancelled) {
          setStatus({
            phase: "error",
            message:
              e instanceof Error
                ? e.message
                : "Something went wrong while connecting Instagram.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connect, searchParams]);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <GlassBackdrop grid={false} />
      <div className="glass-panel w-full max-w-md rounded-3xl px-8 py-10 text-center">
        {status.phase === "working" && (
          <>
            <Loader2 className="mx-auto size-8 animate-spin text-forest-600" />
            <h1 className="mt-5 font-serif text-2xl font-semibold text-ink">
              Connecting Instagram…
            </h1>
            <p className="mt-2 text-sm text-[#6e6a60]">
              Granting read-only access so the AI can study your business and
              competitors. It will never post or message.
            </p>
          </>
        )}

        {status.phase === "success" && (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-forest-100 text-2xl">
              ✅
            </div>
            <h1 className="mt-5 font-serif text-2xl font-semibold text-ink">
              Connected as @{status.username}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#6e6a60]">
              Official Meta research is now live. Regenerate your month and the
              AI will study real profiles — bio, voice, recent posts — for
              free, forever.
            </p>
            <Button asChild className="mt-6 rounded-xl px-6">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </>
        )}

        {status.phase === "error" && (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-50 text-2xl">
              ⚠️
            </div>
            <h1 className="mt-5 font-serif text-2xl font-semibold text-ink">
              Couldn&apos;t connect
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#6e6a60]">
              {status.message}
            </p>
            <Button asChild className="mt-6 rounded-xl px-6">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
