import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cloudy-cookie-consent";
type Choice = "all" | "essential";

function getStoredChoice(): Choice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "all" || raw === "essential") return raw;
  } catch {
    /* storage unavailable — treat as first visit */
  }
  return null;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(() => getStoredChoice() === null);

  const choose = (choice: Choice) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* storage unavailable — dismiss for this session only */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="fixed inset-x-4 bottom-4 z-[70] flex justify-center"
        >
          <div className="glass-panel flex w-full max-w-2xl flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
              <Cookie className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">
                We use cookies to keep you signed in and improve Cloudy.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#6e6a60]">
                Essential cookies keep the site working. Analytics and
                preference cookies help us understand how the Service is used.{" "}
                <Link
                  to="/privacy"
                  className="font-semibold text-forest-700 underline-offset-2 hover:underline"
                >
                  Learn more in our Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button
                className="h-10 rounded-xl px-4 text-sm"
                onClick={() => choose("all")}
              >
                Accept all
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-hairline bg-white px-4 text-sm text-ink hover:bg-cream"
                onClick={() => choose("essential")}
              >
                Essential only
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
