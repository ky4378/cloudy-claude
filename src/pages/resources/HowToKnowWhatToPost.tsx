import { ArticleLayout, type ArticleBlock, type ArticleFaq } from "@/components/pilot/ArticleLayout";

const SLUG = "how-to-know-what-to-post-on-instagram-to-increase-your-views";

const TITLE = "How to Know What to Post on Instagram to Increase Your Views";
const DESCRIPTION =
  "Stop guessing what to post. A practical framework for small businesses to decide daily Instagram content that actually earns views — what to post, when, and why it works.";
const CATEGORY = "Instagram Strategy";
const DATE = "August 24, 2026";
const READ_MINUTES = 6;

const BLOCKS: ArticleBlock[] = [
  {
    type: "p",
    text: "The hardest part of Instagram isn't filming. It's deciding what to film. Most small business owners open the app, stare at the create screen, and post whatever comes to mind — which is why their views stay flat. Views are earned by consistency and by posting content people can't scroll past. Here's the framework to know exactly what to post, every single day.",
  },
  { type: "h2", text: "Start with your customer's problem, not your product" },
  {
    type: "p",
    text: "Before you think about hooks or trends, answer one question: what is my customer struggling with right now? Your content should be a steady stream of answers to that question. A café's customer isn't looking for 'café content' — they're deciding where to grab lunch on a busy Tuesday. A Pilates studio's customer isn't looking for 'fitness content' — they're wondering whether a first class will be intimidating.",
  },
  {
    type: "p",
    text: "Write down the five most common questions customers ask you in person or in DMs. Those five questions are the foundation of your entire content calendar. Each one becomes several posts: a reel that demonstrates the answer, a carousel that explains it, a story that asks the question back to your audience.",
  },
  { type: "h2", text: "Use the 4:1 content ratio" },
  {
    type: "p",
    text: "A simple ratio keeps your feed useful instead of salesy:",
  },
  {
    type: "ul",
    items: [
      "4 posts that give value — tips, behind-the-scenes, education, entertainment",
      "1 post that sells — your offer, a promotion, a testimonial, a booking nudge",
      "The value posts earn views; the selling posts earn revenue. If every post sells, nobody sticks around. If none do, you'll never make money.",
    ],
  },
  { type: "h2", text: "Choose formats by goal, not by habit" },
  {
    type: "p",
    text: "Different goals need different formats. Match the format to what you want the viewer to do:",
  },
  {
    type: "ul",
    items: [
      "Reach new people → Reels with a strong hook in the first 2 seconds and a topic a stranger would care about.",
      "Deepen trust → Carousels with genuinely useful steps or a real story about how you work.",
      "Stay top-of-mind → Stories. Daily check-ins, polls, behind-the-scenes. Low effort, high frequency.",
      "Convert interest → Posts that show the outcome: a before/after, a happy customer, a transformation.",
    ],
  },
  { type: "h2", text: "Plan one week at a time, batch the content" },
  {
    type: "ol",
    items: [
      "Every Sunday, pick your one customer question for the week.",
      "Map it to 4 value posts + 1 selling post across the week.",
      "Shoot and edit everything in one session — one outfit, one location, one mindset. Batching is what makes daily posting sustainable.",
      "Write all captions and hashtags at the same time, then schedule.",
    ],
  },
  {
    type: "tip",
    title: "Make it a habit, not a mood",
    text: "The businesses that grow on Instagram aren't the most creative — they're the most consistent. A predictable weekly rhythm (e.g. 'tips every Monday and Thursday, behind-the-scenes on Wednesday, offer on Friday') trains both the algorithm and your audience to expect you.",
  },
  { type: "h2", text: "Let data steer next week" },
  {
    type: "p",
    text: "Once a week, check your insights and ask three questions: which post got the most views, which got the most saves, and which got the most messages. Saves tell you the content was useful; messages tell you it was compelling. Post more of whatever wins. Cut whatever dies twice in a row. This is how a content plan stops being a guessing game and becomes a system.",
  },
];

const FAQ: ArticleFaq[] = [
  {
    q: "How many times a week should a small business post on Instagram?",
    a: "For growth, aim for 4–5 feed posts a week plus daily stories. Consistency matters more than volume — 4 thoughtful posts every week outperforms 7 rushed ones. If that's too much, start with 3 and be strict about it.",
  },
  {
    q: "What type of Instagram post gets the most views?",
    a: "Reels with a strong opening hook and a topic that interests people outside your existing followers. Practical, relatable content — tips, mistakes to avoid, behind-the-scenes — consistently earns more views than polished product shots.",
  },
  {
    q: "Should I follow trends even if they don't fit my business?",
    a: "Only join a trend if you can connect it to your business within the first 2 seconds. A trend with no connection to your customer's problem is a wasted post. If it doesn't fit, skip it — consistency of your own useful content wins over chasing every trend.",
  },
];

export default function HowToKnowWhatToPost() {
  return (
    <ArticleLayout
      title={TITLE}
      description={DESCRIPTION}
      category={CATEGORY}
      date={DATE}
      readMinutes={READ_MINUTES}
      blocks={BLOCKS}
      faq={FAQ}
      ctaTitle="Never wonder what to post again"
      ctaBody="Cloudy turns your business details into a complete 30-day Instagram plan — every post, caption, hashtag and shot-by-shot instruction already written for you."
      related={[
        { slug: "what-to-post-when-you-have-no-ideas", title: "What to post when you have no ideas: a 30-day plan for small businesses" },
        { slug: "how-often-should-a-small-business-post-on-instagram", title: "How often should a small business post on Instagram?" },
        { slug: "instagram-captions-that-sound-human", title: "Instagram captions that sound human, not AI" },
      ]}
    />
  );
}

export { SLUG };
