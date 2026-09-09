import { Link } from "react-router";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { useEffect } from "react";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { PilotLogo } from "@/components/pilot/BrandMark";
import { usePageMeta } from "@/hooks/use-page-meta";

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "tip"; title: string; text: string };

export type ArticleFaq = { q: string; a: string };

export type RelatedArticle = {
  slug: string;
  title: string;
};

export function ArticleLayout({
  title,
  description,
  category,
  date,
  readMinutes,
  blocks,
  faq = [],
  ctaTitle,
  ctaBody,
  related = [],
}: {
  title: string;
  description: string;
  category: string;
  date: string;
  readMinutes: number;
  blocks: ArticleBlock[];
  faq?: ArticleFaq[];
  ctaTitle: string;
  ctaBody: string;
  related?: RelatedArticle[];
}) {
  usePageMeta(title, description);

  // Structured data: Article + FAQPage (rich results on Google).
  useEffect(() => {
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: title,
          description,
          datePublished: date,
          author: { "@type": "Organization", name: "Cloudy AI" },
          publisher: {
            "@type": "Organization",
            name: "Cloudy AI",
            logo: { "@type": "ImageObject", url: "https://cloudyco.cloud/logo.svg" },
          },
        },
      ],
    };
    if (faq.length > 0) {
      (ld["@graph"] as Record<string, unknown>[]).push({
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      });
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "article-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("article-jsonld")?.remove();
    };
  }, [title, description, date, faq]);

  return (
    <div className="relative min-h-screen">
      <GlassBackdrop />

      <header className="glass-nav fixed inset-x-0 top-0 z-50">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link to="/" aria-label="Cloudy home">
            <PilotLogo />
          </Link>
          <Link
            to="/resources"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6e6a60] transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Resources
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-5 pt-28 pb-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-700">
          {category}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight text-ink md:text-5xl">
          {title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#8f8b83]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {date}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="size-4" />
            {readMinutes} min read
          </span>
        </div>

        <div className="mt-10 space-y-6">
          {blocks.map((block, i) => {
            switch (block.type) {
              case "h2":
                return (
                  <h2
                    key={i}
                    className="pt-4 font-serif text-2xl font-semibold tracking-tight text-ink"
                  >
                    {block.text}
                  </h2>
                );
              case "h3":
                return (
                  <h3 key={i} className="pt-2 text-lg font-semibold text-ink">
                    {block.text}
                  </h3>
                );
              case "ul":
                return (
                  <ul key={i} className="list-disc space-y-2 pl-5">
                    {block.items.map((item) => (
                      <li key={item} className="text-[15px] leading-relaxed text-[#4a473f]">
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              case "ol":
                return (
                  <ol key={i} className="list-decimal space-y-2 pl-5">
                    {block.items.map((item) => (
                      <li key={item} className="text-[15px] leading-relaxed text-[#4a473f]">
                        {item}
                      </li>
                    ))}
                  </ol>
                );
              case "tip":
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-forest-200/60 bg-forest-50/60 p-5"
                  >
                    <p className="text-sm font-semibold text-forest-800">
                      {block.title}
                    </p>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[#3f4a44]">
                      {block.text}
                    </p>
                  </div>
                );
              default:
                return (
                  <p key={i} className="text-[15px] leading-relaxed text-[#4a473f]">
                    {block.text}
                  </p>
                );
            }
          })}
        </div>

        {faq.length > 0 && (
          <section className="mt-14 border-t border-hairline pt-10">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
              Frequently asked questions
            </h2>
            <div className="mt-5 space-y-5">
              {faq.map((f) => (
                <div key={f.q}>
                  <h3 className="text-[15px] font-semibold text-ink">{f.q}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#4a473f]">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-14 border-t border-hairline pt-10">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
              Keep reading
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/resources/${r.slug}`}
                  className="group rounded-2xl border border-hairline bg-white/70 p-5 transition-all hover:border-forest-300 hover:shadow-sm"
                >
                  <p className="text-[15px] font-medium leading-snug text-ink group-hover:text-forest-800">
                    {r.title}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-forest-700">
                    Read article
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-14 overflow-hidden rounded-3xl bg-gradient-to-br from-forest-700 to-forest-900 p-8 text-white sm:p-10">
          <h2 className="font-serif text-2xl font-medium tracking-tight sm:text-3xl">
            {ctaTitle}
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/80">
            {ctaBody}
          </p>
          <Link
            to="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-forest-900 transition-transform hover:scale-[1.02]"
          >
            Try Cloudy for free
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-hairline bg-cream/40">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-[#8f8b83] sm:flex-row">
          <p>© {new Date().getFullYear()} Cloudy AI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/resources" className="transition-colors hover:text-forest-700">
              Resources
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-forest-700">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-forest-700">
              Terms
            </Link>
            <Link to="/refunds" className="transition-colors hover:text-forest-700">
              Refunds
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

