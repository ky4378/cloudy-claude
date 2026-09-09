import { PilotLogo } from "@/components/pilot/BrandMark";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Full-screen progress view shown while the AI pipeline runs. The checklist
 * advances on a timer for reassurance but the screen only goes away when the
 * server action actually resolves (the parent unmounts it).
 */
export function GeneratingScreen({ steps }: { steps: string[] }) {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisible((v) => (v < steps.length - 1 ? v + 1 : v));
    }, 5500);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/95 px-5 backdrop-blur-sm">
      <div className="card-surface w-full max-w-md p-8 text-center">
        <PilotLogo />
        <div className="mx-auto mt-6 flex size-14 items-center justify-center rounded-2xl bg-sage">
          <Loader2 className="size-6 animate-spin text-forest-700" />
        </div>
        <h2 className="mt-5 font-serif text-2xl font-medium tracking-tight text-ink">
          Cloudy is planning your month
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-secondary-text">
          This usually takes one to two minutes. Please keep this tab open.
        </p>
        <ul className="mt-6 space-y-2.5 text-left">
          {steps.map((label, i) => {
            const done = i < visible;
            const active = i === visible;
            return (
              <li
                key={label}
                className={`flex items-center gap-3 text-sm transition-colors ${
                  done ? "text-forest-700" : active ? "text-ink" : "text-secondary-text/60"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    done
                      ? "border-ink bg-ink text-white"
                      : active
                        ? "border-ink"
                        : "border-hairline"
                  }`}
                >
                  {done ? (
                    <Check className="size-3" />
                  ) : active ? (
                    <Loader2 className="size-3 animate-spin text-ink" />
                  ) : null}
                </span>
                {label}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
