import { ArticleLayout, type ArticleBlock, type ArticleFaq } from "@/components/pilot/ArticleLayout";

const SLUG = "how-often-should-a-small-business-post-on-instagram";

const TITLE = "How Often Should a Small Business Post on Instagram?";
const DESCRIPTION =
  "The real answer to 'how often should I post on Instagram' for small businesses — feed vs stories, minimums that work, and how to stay consistent without burning out.";
const CATEGORY = "Instagram Strategy";
const DATE = "August 24, 2026";
const READ_MINUTES = 5;

const BLOCKS: ArticleBlock[] = [
  {
    type: "p",
    text: "Ask five 'gurus' how often to post and you'll get five different answers: 'daily!', '3 times a week!', '10 reels a day!' — all delivered with total confidence. The honest answer for a small business is simpler: post at a frequency you can sustain for six months, and let consistency do the heavy lifting.",
  },
  { type: "h2", text: "The short answer" },
  {
    type: "ul",
    items: [
      "Feed (Reels + carousels): 4–5 times per week is the sweet spot for growth.",
      "Minimum viable: 3 times per week, every week, no exceptions.",
      "Stories: 4–7 times per week — even just a photo or a poll counts.",
      "Quality floor: every feed post should have a purpose (value, story, or offer).",
    ],
  },
  { type: "h2", text: "Why frequency matters less than consistency" },
  {
    type: "p",
    text: "The Instagram algorithm rewards accounts that post predictably. When you post on a rhythm — say every Monday, Wednesday and Friday at the same time — the platform learns when to expect you, and your audience learns to look for you. Posting 10 times one week and nothing the next teaches both of them nothing.",
  },
  {
    type: "p",
    text: "There's a second, less obvious reason consistency wins: compounding. Each post is a chance to be discovered. One extra post a week is 52 more discovery chances a year. Over 12 months, the business that posts steadily at 4 times a week almost always beats the one that posts 9 times for a month and disappears.",
  },
  { type: "h2", text: "Match frequency to your goals" },
  {
    type: "ul",
    items: [
      "Brand awareness / growth: lean toward 5+ feed posts a week, with at least 3 Reels. Reach is driven by video discovery.",
      "Trust and customers: 3–4 feed posts is fine if they're strong, but pair them with daily-ish stories — stories are where existing followers decide to buy.",
      "You're the bottleneck (solo owner): 3 feed posts a week, batched in one session, plus stories when you have a genuine moment to share. Sustainability beats ambition.",
    ],
  },
  { type: "h2", text: "The daily-stories rule" },
  {
    type: "p",
    text: "Stories are the cheapest growth tool you're probably ignoring. They don't need polish, they reach the people who already know you, and the interactive stickers (polls, questions, quizzes) tell you exactly what your audience cares about. A café can post a story of the morning pastries; a studio can post a poll asking which class time people prefer. Ten minutes a day keeps your business present without the pressure of a perfect reel.",
  },
  { type: "h2", text: "When to post more (or less)" },
  {
    type: "ul",
    items: [
      "Post more during your busy season, launches, or local events — relevance beats frequency.",
      "Post less when you're stretched thin, but never drop below your minimum for two weeks straight.",
      "If a post does unusually well, don't disappear — follow it up within 48 hours with related content while attention is still there.",
    ],
  },
  {
    type: "tip",
    title: "Set a minimum, not a target",
    text: "Targets feel optional; minimums don't. Decide your non-negotiable number ('3 feed posts + 3 stories every week') and treat it like an appointment with a paying client. Growth follows the businesses that show up.",
  },
];

const FAQ: ArticleFaq[] = [
  {
    q: "Is posting every day on Instagram necessary?",
    a: "No. Daily posting works if you can sustain it, but 4–5 solid posts a week beats 7 rushed ones. For most small businesses, consistency at 3–5 posts per week is enough to grow.",
  },
  {
    q: "Does posting more often increase views?",
    a: "More posts mean more chances to be discovered, but only if each post is decent. The bigger lever is consistency over months — the algorithm rewards accounts that publish on a steady rhythm.",
  },
  {
    q: "Should I post on weekends?",
    a: "If your customers are around on weekends (cafés, salons, gyms), yes — that's often when local businesses get their best engagement. Test it: check your insights to see which days your audience is most active.",
  },
  {
    q: "How many stories a day should I post?",
    a: "There's no strict number — 2–5 story frames on the days you post stories is healthy. Use them for real moments and interaction (polls, questions), not a second feed.",
  },
];

export default function HowOftenToPost() {
  return (
    <ArticleLayout
      title={TITLE}
      description={DESCRIPTION}
      category={CATEGORY}
      date={DATE}
      readMinutes={READ_MINUTES}
      blocks={BLOCKS}
      faq={FAQ}
      ctaTitle="Keep your posting rhythm on autopilot"
      ctaBody="Cloudy builds your full month of posts in one go — so 'how often should I post' becomes a calendar you follow, not a decision you make daily."
      related={[
        { slug: "how-to-know-what-to-post-on-instagram-to-increase-your-views", title: "How to know what to post on Instagram to increase your views" },
        { slug: "what-to-post-when-you-have-no-ideas", title: "What to post when you have no ideas: a 30-day plan" },
        { slug: "how-to-get-more-customers-on-instagram", title: "How to get more customers on Instagram as a local business" },
      ]}
    />
  );
}

export { SLUG };
