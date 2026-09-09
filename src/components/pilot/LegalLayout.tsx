import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { PilotLogo } from "@/components/pilot/BrandMark";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <GlassBackdrop />

      <header className="glass-nav fixed inset-x-0 top-0 z-50">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link to="/" aria-label="Cloudy home">
            <PilotLogo />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6e6a60] transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-700">
          Legal
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-ink md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[#8f8b83]">
          Last Updated: <span className="font-medium text-[#6e6a60]">{updated}</span>
        </p>
        <div className="mt-10">{children}</div>
      </main>

      <footer className="border-t border-hairline bg-cream/40">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-[#8f8b83] sm:flex-row">
          <p>© {new Date().getFullYear()} Cloudy AI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link
              to="/resources"
              className="transition-colors hover:text-forest-700"
            >
              Resources
            </Link>
            <Link
              to="/privacy"
              className="transition-colors hover:text-forest-700"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="transition-colors hover:text-forest-700"
            >
              Terms
            </Link>
            <Link
              to="/refunds"
              className="transition-colors hover:text-forest-700"
            >
              Refunds
            </Link>
            <Link to="/" className="transition-colors hover:text-forest-700">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
