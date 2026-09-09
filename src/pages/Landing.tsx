import { FadeUp } from "@/components/marketing/FadeUp";
import { Faq } from "@/components/marketing/Faq";
import { Footer } from "@/components/marketing/Footer";
import { AnchorLink, Nav } from "@/components/marketing/Nav";
import { HeroMockup, ProductMockup } from "@/components/marketing/PlanMockup";
import { PricingCards, PricingTable } from "@/components/marketing/PricingSection";
import { Eyebrow, SectionHeading } from "@/components/marketing/SectionHeading";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { usePageMeta } from "@/hooks/use-page-meta";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Captions,
  Clapperboard,
  Coffee,
  Dumbbell,
  Fingerprint,
  Lightbulb,
  MoreHorizontal,
  Radar,
  Scissors,
  Sparkles,
  Store,
  TrendingUp,
  UtensilsCrossed,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const BUSINESS_CATEGORIES = [
  { label: "Cafés", icon: Coffee },
  { label: "Restaurants", icon: UtensilsCrossed },
  { label: "Salons", icon: Scissors },
  { label: "Retail stores", icon: Store },
  { label: "Fitness studios", icon: Dumbbell },
  { label: "Beauty businesses", icon: Sparkles },
  { label: "Local services", icon: Wrench },
  { label: "And more", icon: MoreHorizontal },
];

const STEPS = [
  {
    title: "Tell Cloudy about your business",
    body: "Answer a few simple questions about your business, audience, goals, brand and social media.",
  },
  {
    title: "Cloudy studies your opportunity",
    body: "Cloudy uses your information, trends, competitors and industry context to identify useful marketing opportunities.",
  },
  {
    title: "Get your 30-day plan",
    body: "AI creates a personalized month of content with post ideas, captions, Reels, scripts, hashtags and posting times.",
  },
  {
    title: "Create, post & improve",
    body: "Follow your plan, track what works and use the insights to improve your next month.",
  },
];

const FEATURES = [
  { icon: CalendarCheck2, title: "AI 30-day plans", body: "Generate an entire month of personalized content." },
  { icon: TrendingUp, title: "Trend & opportunity insights", body: "Identify relevant trends and opportunities for your industry." },
  { icon: Radar, title: "Competitor insights", body: "Understand what competitors are doing and spot gaps and opportunities." },
  { icon: Captions, title: "Captions & hashtags", body: "Ready-to-use captions and relevant hashtags." },
  { icon: Clapperboard, title: "Reel ideas & scripts", body: "Practical Reel concepts, hooks and scripts you can actually film." },
  { icon: Fingerprint, title: "Personalized to your brand", body: "Content adapted to your business, audience, goals and tone." },
];

const PERSONALIZATION_INPUTS = [
  "Business type",
  "Location",
  "Target audience",
  "Goals",
  "Brand personality",
  "Preferred tone",
  "Existing social media",
  "Content preferences",
  "Industry trends",
  "Competitor landscape",
];

const TONES: { id: string; caption: string }[] = [
  { id: "Professional", caption: "Our seasonal menu launches Monday. Reserve your table — we'd be glad to host you." },
  { id: "Luxury", caption: "The new seasonal menu arrives Monday. A quiet table, a slower evening — reserved for you." },
  { id: "Funny", caption: "New menu Monday. Yes, we tasted everything. Twice. For science. Book a table 🍴" },
  { id: "Educational", caption: "New menu Monday — here's why we change it every season (and what's finally back)." },
  { id: "Friendly", caption: "new menu drops monday and we can't wait for you to try it 💛 come say hi!" },
  { id: "Bold", caption: "New menu. Monday. You're going to want a table. Book now." },
];

const BENEFITS = [
  { icon: Lightbulb, title: "Never wonder what to post", body: "You always have your next piece of content ready." },
  { icon: CalendarCheck2, title: "Stay consistent", body: "Know what to post and when to post it." },
  { icon: Zap, title: "Turn ideas into action", body: "Get practical content you can actually create." },
  { icon: BarChart3, title: "Make smarter decisions", body: "Use trends, competition and performance insights to guide your strategy." },
];

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function Hero({ authed }: { authed: boolean }) {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="hero-grid pointer-events-none absolute inset-x-0 top-0 h-[760px]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <span className="glass-chip inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-forest-700">
            <span className="text-forest-600">✦</span>
            New — AI 30-day marketing plans for local businesses
          </span>
          <h1 className="mt-7 font-serif text-5xl font-medium leading-[1.02] tracking-tight text-ink sm:text-6xl md:text-7xl">
            Your entire month of <span className="text-forest-gradient">marketing</span>, planned by AI.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-secondary-text md:text-lg">
            Stop wondering what to post. Cloudy creates a complete 30-day marketing plan for your
            business — including what to post, what to film, captions, hashtags, Reel ideas, scripts
            and posting times. You just create and post.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-base">
              <Link to={authed ? "/dashboard" : "/signup"}>
                {authed ? "Go to dashboard" : "Start my plan"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-7 text-base">
              <AnchorLink id="product">See what Cloudy creates</AnchorLink>
            </Button>
          </div>
          <p className="mt-4 text-xs text-secondary-text">1-minute setup · Cancel anytime</p>
        </FadeUp>
        <FadeUp delay={0.15} className="mt-16 md:mt-20">
          <HeroMockup />
        </FadeUp>
      </div>
    </section>
  );
}

function BusinessTypes() {
  return (
    <section className="py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <FadeUp>
          <SectionHeading eyebrow="Who it's for" title="Marketing help built for businesses." />
        </FadeUp>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {BUSINESS_CATEGORIES.map((c, i) => (
            <FadeUp key={c.label} delay={i * 0.04}>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-16 items-center justify-center rounded-full border border-hairline bg-white text-forest-700 shadow-[0_10px_30px_-20px_rgba(23,23,23,0.3)]">
                  <div className="flex size-11 items-center justify-center rounded-full bg-sage">
                    <c.icon className="size-5" strokeWidth={1.8} />
                  </div>
                </div>
                <p className="text-sm font-medium text-ink">{c.label}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <FadeUp>
          <SectionHeading
            eyebrow="How it works"
            title="From blank page to 30 days of content."
            description="Four steps. No marketing degree required."
          />
        </FadeUp>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <FadeUp key={s.title} delay={i * 0.06}>
              <div className="card-surface flex h-full flex-col p-7">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary font-serif text-lg text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-6 font-serif text-xl font-medium leading-snug text-ink">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-secondary-text">{s.body}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function Product() {
  return (
    <section id="product" className="scroll-mt-24 bg-white/60 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <FadeUp>
          <SectionHeading
            eyebrow="The product"
            title="See exactly what Cloudy creates."
            description="A 30-day calendar with everything you need for each day: the idea, the hook, the caption, the hashtags, the Reel script, the goal and the best time to post."
          />
        </FadeUp>
        <FadeUp delay={0.1} className="mt-14">
          <ProductMockup />
        </FadeUp>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <FadeUp>
          <SectionHeading
            eyebrow="Features"
            title="Everything a small team needs to market like a big one."
          />
        </FadeUp>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.05}>
              <div className="card-surface h-full p-7">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-sage text-forest-700">
                  <f.icon className="size-5" strokeWidth={1.8} />
                </div>
                <h3 className="mt-5 font-serif text-xl font-medium text-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary-text">{f.body}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function Personalization() {
  const [tone, setTone] = useState(TONES[4]);
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2">
        <FadeUp>
          <Eyebrow className="mb-4">Personalization</Eyebrow>
          <h2 className="font-serif text-3xl font-medium leading-[1.1] tracking-tight text-ink md:text-5xl">
            Your business isn't generic. Your marketing shouldn't be either.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-secondary-text md:text-lg">
            Cloudy doesn't hand you templates. Every plan is written from what makes your business
            yours — and the content you actually want to make.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {PERSONALIZATION_INPUTS.map((p) => (
              <li
                key={p}
                className="rounded-full border border-hairline bg-white px-3.5 py-1.5 text-sm text-ink"
              >
                {p}
              </li>
            ))}
          </ul>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div className="card-surface p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary-text">
              Preferred tone
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    tone.id === t.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-hairline bg-white text-ink hover:border-forest-300",
                  )}
                >
                  {t.id}
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-paper p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-text">
                Example caption · {tone.id}
              </p>
              <p key={tone.id} className="mt-2 font-serif text-lg leading-snug text-ink animate-in fade-in duration-300">
                “{tone.caption}”
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <FadeUp>
          <SectionHeading eyebrow="Results" title="Spend less time planning. Spend more time growing." />
        </FadeUp>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b, i) => (
            <FadeUp key={b.title} delay={i * 0.05}>
              <div className="card-surface h-full p-7">
                <b.icon className="size-6 text-forest-600" strokeWidth={1.8} />
                <h3 className="mt-5 font-serif text-xl font-medium text-ink">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary-text">{b.body}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 bg-white/60 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <FadeUp>
          <SectionHeading
            eyebrow="Pricing"
            title="Simple plans for every stage."
            description="Every plan includes AI captions, hashtags, Reel ideas and a personalized 30-day marketing plan. Pick the amount of AI you need."
          />
        </FadeUp>
        <FadeUp delay={0.08} className="mt-14">
          <PricingCards />
          <p className="mt-6 text-center text-sm text-secondary-text">Cancel anytime.</p>
        </FadeUp>
        <FadeUp delay={0.1} className="mt-14">
          <PricingTable />
        </FadeUp>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-5">
        <FadeUp>
          <SectionHeading eyebrow="FAQ" title="Questions, answered." />
        </FadeUp>
        <FadeUp delay={0.08} className="mt-12">
          <Faq />
        </FadeUp>
      </div>
    </section>
  );
}

function FinalCta({ authed }: { authed: boolean }) {
  return (
    <section className="px-5 pb-24 md:pb-32">
      <FadeUp>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-primary px-6 py-20 text-center text-paper md:py-28">
          <div className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-forest-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-0 size-72 rounded-full bg-white/5 blur-3xl" />
          <h2 className="relative font-serif text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            Stop wondering what to post.
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-base text-white/70 md:text-lg">
            Let Cloudy plan your next 30 days of marketing.
          </p>
          <Button
            asChild
            size="lg"
            className="relative mt-9 h-12 rounded-full bg-paper px-7 text-base text-ink hover:bg-white"
          >
            <Link to={authed ? "/dashboard" : "/signup"}>
              {authed ? "Go to dashboard" : "Start my plan"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </FadeUp>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  usePageMeta(
    "Cloudy — Your entire month of marketing, planned by AI",
    "Cloudy creates a complete 30-day marketing plan for your local business — what to post, what to film, captions, hashtags, Reel ideas, scripts and posting times.",
  );

  // Arriving at /#section from another page → scroll once mounted.
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  return (
    <div className="relative min-h-screen text-ink">
      <GlassBackdrop grid={false} />
      <Nav />
      <main>
        <Hero authed={isAuthenticated} />
        <BusinessTypes />
        <HowItWorks />
        <Product />
        <Features />
        <Personalization />
        <Benefits />
        <Pricing />
        <FaqSection />
        <FinalCta authed={isAuthenticated} />
      </main>
      <Footer />
    </div>
  );
}
