import { PilotLogo } from "@/components/pilot/BrandMark";
import { Link } from "react-router";
import { AnchorLink } from "./Nav";

const COLUMNS: {
  title: string;
  links: { label: string; to?: string; anchor?: string }[];
}[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", anchor: "how-it-works" },
      { label: "Product", anchor: "product" },
      { label: "Pricing", anchor: "pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "FAQ", anchor: "faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms & Conditions", to: "/terms" },
    ],
  },
];

export function Footer() {
  const linkClass = "text-sm text-secondary-text transition-colors hover:text-ink";
  return (
    <footer className="border-t border-hairline bg-paper">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <PilotLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-secondary-text">
              AI-powered marketing plans for local businesses.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink">
                {col.title}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className={linkClass}>
                        {l.label}
                      </Link>
                    ) : (
                      <AnchorLink id={l.anchor ?? ""} className={linkClass}>
                        {l.label}
                      </AnchorLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-hairline pt-6 text-xs text-secondary-text sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Cloudy. All rights reserved.</p>
          <p>Made for the businesses that make neighbourhoods worth living in.</p>
        </div>
      </div>
    </footer>
  );
}
