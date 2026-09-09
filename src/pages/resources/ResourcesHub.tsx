import { Link } from "react-router";
import { ArrowRight, Clock3 } from "lucide-react";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { PilotLogo } from "@/components/pilot/BrandMark";
import { usePageMeta } from "@/hooks/use-page-meta";

type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
  date: string;
};

const ARTICLES: Article[] = [
  {
    slug: "how-to-know-what-to-post-on-instagram-to-increase-your-views",
    title: "How to Know What to Post on Instagram to Increase Your Views",
    excerpt:
      "Stop guessing what to film. A practical framework for deciding daily Instagram content that actually earns views — what to post, when, and why it works.",
    category: "Instagram Strategy",
    readMinutes: 6,
    date: "Aug 24, 2026",
  },
  {
    slug: "what-to-post-when-you-have-no-ideas",
    title: "What to Post When You Have No Ideas: a 30-Day Plan for Small Businesses",
    excerpt:
      "A fill-in-the-blank 30-day content plan. Every day has a post type, a topic and an example — no brainstorming required.",
    category: "Content Planning",
    readMinutes: 7,
    date: "Aug 24, 2026",
  },
  {
    slug: "how-often-should-a-small-business-post-on-instagram",
    title: "How Often Should a Small Business Post on Instagram?",
    excerpt:
      "The real answer for small businesses — feed vs stories, minimums that actually work, and how to stay consistent without burning out.",
    category: "Instagram Strategy",
    readMinutes: 5,
    date: "Aug 24, 2026",
  },
  {
    slug: "instagram-captions-that-sound-human",
    title: "Instagram Captions That Sound Human, Not AI",
    excerpt:
      "Why AI-generated captions feel flat — and the exact writing rules that make your captions sound like a real person. With before/after examples.",
    category: "Copywriting",
    readMinutes: 6,
    date: "Aug 24, 2026",
  },
  {
    slug: "how-to-get-more-customers-on-instagram",
    title: "How to Get More Customers on Instagram as a Local Business",
    excerpt:
      "Turning followers into paying customers — local content angles, offers that convert, and the booking-path mistakes to avoid.",
    category: "Local Marketing",
    readMinutes: 7,
    date: "Aug 24, 2026",
  },
  {
    slug: "instagram-hashtags-for-small-businesses",
    title: "Instagram Hashtags for Small Businesses: the Local + Niche Method",
    excerpt:
      "Stop using the same 30 generic hashtags. A repeatable system for choosing hashtags that actually reach your local customers.",
    category: "Instagram Strategy",
    readMinutes: 6,
    date: "Aug 24, 2026",
  },
];

export default function ResourcesHub() {
  usePageMeta(
    "Resources — Cloudy AI | Instagram Guides for Small Businesses",
    "Practical, no-fluff guides on Instagram for small businesses: what to post, how often, captions that convert, local hashtags, and getting more customers.",
  );

  return (
    <div className="relative min-h-screen">
      <GlassBackdrop />

      <header className="glass-nav fixed inset-x-0 top-0 z-50">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" aria-label="Cloudy home">
            <PilotLogo />
          </Link>
          <div className="flex items-center gap-5 text-sm font-medium text-[#6e6a60]">
            <Link to="/resources" className="text-forest-700">
              Resources
            </Link>
            <Link to="/signup" className="transition-colors hover:text-ink">
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pt-28 pb-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-700">
          Resources
        </p>
        <h1 className="mt-3 max-w-3xl font-serif text-4xl font-medium leading-tight tracking-tight text-ink md:text-5xl">
          Instagram guides for small businesses that actually want customers
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#6e6a60]">
          No growth-hack nonsense. Practical playbooks on what to post, how
          often, how to write captions people read, and how to turn followers
          into paying customers.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.map((article) => (
            <Link
              key={article.slug}
              to={`/resources/${article.slug}`}
              className="group flex flex-col rounded-3xl border border-hairline bg-white/70 p-6 transition-all hover:-translate-y-0.5 hover:border-forest-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3 text-xs text-[#8f8b83]">
                <span className="rounded-full bg-forest-100 px-3 py-1 font-semibold text-forest-800">
                  {article.category}
                </span>
              </div>
              <h2 className="mt-4 font-serif text-xl font-semibold leading-snug tracking-tight text-ink group-hover:text-forest-800">
                {article.title}
              </h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[#6e6a60]">
                {article.excerpt}
              </p>
              <div className="mt-5 flex items-center justify-between text-xs text-[#8f8b83]">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" />
                  {article.readMinutes} min read
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-forest-700">
                  Read
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-16 overflow-hidden rounded-3xl bg-gradient-to-br from-forest-700 to-forest-900 p-8 text-white sm:p-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-serif text-2xl font-medium tracking-tight sm:text-3xl">
                Want this done for you, every month?
              </h2>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/80">
                Cloudy turns your business details into a complete 30-day
                Instagram plan — every post, caption, hashtag and shot-by-shot
                instruction already written in your brand's voice.
              </p>
            </div>
            <Link
              to="/signup"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-forest-900 transition-transform hover:scale-[1.02]"
            >
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline bg-cream/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-[#8f8b83] sm:flex-row">
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

export { ARTICLES };
