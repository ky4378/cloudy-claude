import { PilotLogo } from "@/components/pilot/BrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";

export const NAV_LINKS = [
  ["How it works", "how-it-works"],
  ["Product", "product"],
  ["Pricing", "pricing"],
  ["FAQ", "faq"],
] as const;

/** Anchor link that scrolls on the landing page and navigates to "/#id" elsewhere. */
export function AnchorLink({
  id,
  className,
  children,
  onClick,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.();
    if (location.pathname !== "/") {
      e.preventDefault();
      navigate(`/#${id}`);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${id}`);
    }
  };
  return (
    <a href={`/#${id}`} onClick={handle} className={className}>
      {children}
    </a>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <header className="glass-nav fixed inset-x-0 top-0 z-50">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" aria-label="Cloudy home" className="flex items-center">
          <PilotLogo />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(([label, id]) => (
            <AnchorLink
              key={id}
              id={id}
              className="text-sm font-medium text-secondary-text transition-colors hover:text-ink"
            >
              {label}
            </AnchorLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <Button asChild className="rounded-full px-5">
              <Link to="/dashboard">
                Dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="rounded-full text-secondary-text">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild className="rounded-full px-5">
                <Link to="/signup">
                  Get started
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="glass-chip flex size-10 items-center justify-center md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="card-surface mx-4 mb-4 p-3 md:hidden">
          {NAV_LINKS.map(([label, id]) => (
            <AnchorLink
              key={id}
              id={id}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-cream"
            >
              {label}
            </AnchorLink>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-hairline pt-3">
            {isAuthenticated ? (
              <Button asChild className="col-span-2 rounded-xl">
                <Link to="/dashboard" onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild className="rounded-xl">
                  <Link to="/signup" onClick={() => setOpen(false)}>
                    Get started
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
