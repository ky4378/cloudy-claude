import { ArticleLayout, type ArticleBlock, type ArticleFaq } from "@/components/pilot/ArticleLayout";

const SLUG = "what-to-post-when-you-have-no-ideas";

const TITLE = "What to Post When You Have No Ideas: a 30-Day Plan for Small Businesses";
const DESCRIPTION =
  "A fill-in-the-blank 30-day Instagram content plan for small businesses. Every day has a post type, a topic and an example — no brainstorming required.";
const CATEGORY = "Content Planning";
const DATE = "August 24, 2026";
const READ_MINUTES = 7;

const BLOCKS: ArticleBlock[] = [
  {
    type: "p",
    text: "Writer's block isn't a creativity problem — it's a planning problem. If you wait until 9am to decide what to post today, you'll panic-post something forgettable. The fix is a plan that already made every decision for you. Here's a 30-day structure any small business can follow, week by week.",
  },
  { type: "h2", text: "The month at a glance" },
  {
    type: "p",
    text: "Every week has a theme. Every day has a job. You only need to fill in the specifics for your business:",
  },
  {
    type: "ul",
    items: [
      "Week 1 — Introduce: who you are, what you do, how you work.",
      "Week 2 — Educate: answer the questions customers actually ask.",
      "Week 3 — Prove: results, reviews, transformations, real moments.",
      "Week 4 — Convert: offers, booking nudges, and a clear call to action.",
    ],
  },
  { type: "h2", text: "The 30-day template" },
  { type: "h3", text: "Week 1 — Introduce (Days 1–7)" },
  {
    type: "ol",
    items: [
      "Day 1: Founder story — why the business exists. (Reel or carousel)",
      "Day 2: Behind the scenes — what a typical day looks like. (Reel)",
      "Day 3: Your signature product or service, up close. (Photo carousel)",
      "Day 4: Your space or team — the human side. (Carousel)",
      "Day 5: A customer question you always get. (Carousel)",
      "Day 6: The process — how an order or booking works from start to finish. (Reel)",
      "Day 7: Rest / share a customer review.",
    ],
  },
  { type: "h3", text: "Week 2 — Educate (Days 8–14)" },
  {
    type: "ol",
    items: [
      "Day 8: 3 mistakes customers make before choosing a business like yours.",
      "Day 9: What to look for when comparing providers (positioning).",
      "Day 10: A myth about your industry, debunked.",
      "Day 11: How to get the most out of your product or service.",
      "Day 12: A quick how-to, step by step. (Carousel)",
      "Day 13: Answer the top DM question of the week. (Reel)",
      "Day 14: Rest / share a fun fact or industry insight.",
    ],
  },
  { type: "h3", text: "Week 3 — Prove (Days 15–21)" },
  {
    type: "ol",
    items: [
      "Day 15: A before/after or transformation story.",
      "Day 16: A customer testimonial, told as a story.",
      "Day 17: A 'day in the life' of a happy customer.",
      "Day 18: Numbers that matter — results you've delivered.",
      "Day 19: A real, unpolished moment from the business.",
      "Day 20: A regular customer feature.",
      "Day 21: Rest / share a thank-you post.",
    ],
  },
  { type: "h3", text: "Week 4 — Convert (Days 22–30)" },
  {
    type: "ol",
    items: [
      "Day 22: Your main offer, framed as the solution to a problem.",
      "Day 23: Why now — the season, the event, the timing.",
      "Day 24: A limited-time promotion or bundle.",
      "Day 25: FAQs about booking, pricing or delivery — remove the friction.",
      "Day 26: A direct call to action: book, visit, or DM 'START'.",
      "Day 27: A customer objection, answered honestly.",
      "Day 28: Recap the month — your best content again.",
      "Day 29: Ask your audience what they want to see next month.",
      "Day 30: Plan next month using their answers.",
    ],
  },
  { type: "h2", text: "How to fill in the blanks fast" },
  {
    type: "ol",
    items: [
      "Set a timer for 20 minutes and write one line per day for your business.",
      "Don't polish — a rough topic ('Day 3: close-up of our signature latte') is enough to shoot later.",
      "Shoot in batches: 4 photos and 2 short videos cover most of a week.",
      "Reuse winners: if a post performs well, remake it with a new hook next month.",
    ],
  },
  {
    type: "tip",
    title: "The 30-day plan is a system, not a sentence",
    text: "The template works because the decisions are already made: format, angle and goal for every day. All that's left is execution — which is exactly why a 30-day plan beats 'posting when inspired' every single time.",
  },
];

const FAQ: ArticleFaq[] = [
  {
    q: "What should a small business post on Instagram every day?",
    a: "Follow a weekly rhythm: introduce, educate, prove, then convert. Each week covers one theme, so you always know what day's post should accomplish — and you never scramble for ideas.",
  },
  {
    q: "How do I keep up with daily posting without burning out?",
    a: "Batch your content. Shoot and caption a week's worth of posts in one session (1–2 hours). Daily posting becomes a 5-minute scheduling task instead of a daily production.",
  },
  {
    q: "Do I really need 30 posts a month?",
    a: "No — consistency beats volume. If 30 feels heavy, do the same plan at a slower pace: 3 posts a week across the four weekly themes. The structure is what matters, not the count.",
  },
];

export default function WhatToPostWhenYouHaveNoIdeas() {
  return (
    <ArticleLayout
      title={TITLE}
      description={DESCRIPTION}
      category={CATEGORY}
      date={DATE}
      readMinutes={READ_MINUTES}
      blocks={BLOCKS}
      faq={FAQ}
      ctaTitle="Get your 30-day plan written for you"
      ctaBody="Answer a few questions about your business and Cloudy generates a complete month of posts — tailored to your business, your audience and your goals, with captions and hashtags included."
      related={[
        { slug: "how-to-know-what-to-post-on-instagram-to-increase-your-views", title: "How to know what to post on Instagram to increase your views" },
        { slug: "how-often-should-a-small-business-post-on-instagram", title: "How often should a small business post on Instagram?" },
        { slug: "instagram-hashtags-for-small-businesses", title: "Instagram hashtags for small businesses: the local + niche method" },
      ]}
    />
  );
}

export { SLUG };
