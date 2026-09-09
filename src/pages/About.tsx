import { FadeUp } from "@/components/marketing/FadeUp";
import { Footer } from "@/components/marketing/Footer";
import { Nav } from "@/components/marketing/Nav";
import { Eyebrow } from "@/components/marketing/SectionHeading";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

const VALUES = [
  {
    title: "Specific beats generic",
    body: "A plan is only useful if you can act on it today. Every idea Cloudy writes names your product, your street and your customer.",
  },
  {
    title: "Consistency is the strategy",
    body: "Local businesses don't need viral moments. They need to show up every week, for months. Cloudy makes showing up the easy part.",
  },
  {
    title: "You stay in control",
    body: "Cloudy plans and writes; you review, film and post. Your voice, your account, your relationships with customers.",
  },
];

export default function About() {
  usePageMeta("About Cloudy", "Why we built Cloudy — AI marketing plans for local businesses.");
  return (
    <div className="relative min-h-screen text-ink">
      <GlassBackdrop grid={false} />
      <Nav />
      <main className="pt-32 pb-24 md:pt-40">
        <div className="mx-auto max-w-3xl px-5">
          <FadeUp>
            <Eyebrow className="mb-4">About</Eyebrow>
            <h1 className="font-serif text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
              Great local businesses deserve great marketing — without hiring an agency.
            </h1>
            <p className="mt-7 text-lg leading-relaxed text-secondary-text">
              Cloudy started with a simple observation: the owners of the best cafés, salons and
              studios in any neighbourhood are brilliant at their craft and exhausted by social
              media. Not because it's hard, but because deciding what to post every single day is
              a second job nobody signed up for.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-secondary-text">
              So we built the strategist they couldn't afford to hire. Tell Cloudy about your
              business once and it plans your entire month — the ideas, the hooks, the captions,
              the hashtags, the scripts and the posting times — personalized to your brand, your
              customers and your goals.
            </p>
          </FadeUp>
          <div className="mt-16 grid gap-5 sm:grid-cols-3">
            {VALUES.map((v, i) => (
              <FadeUp key={v.title} delay={i * 0.06}>
                <div className="card-surface h-full p-6">
                  <h3 className="font-serif text-xl font-medium text-ink">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-secondary-text">{v.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.1} className="mt-16">
            <Button asChild size="lg" className="h-12 rounded-full px-7">
              <Link to="/signup">
                Start my plan
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </FadeUp>
        </div>
      </main>
      <Footer />
    </div>
  );
}
