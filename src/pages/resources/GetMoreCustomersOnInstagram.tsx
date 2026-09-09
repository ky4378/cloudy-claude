import { ArticleLayout, type ArticleBlock, type ArticleFaq } from "@/components/pilot/ArticleLayout";

const SLUG = "how-to-get-more-customers-on-instagram";

const TITLE = "How to Get More Customers on Instagram as a Local Business";
const DESCRIPTION =
  "A local business guide to turning Instagram followers into paying customers — local content angles, offers that convert, and the booking-path mistakes to avoid.";
const CATEGORY = "Local Marketing";
const DATE = "August 24, 2026";
const READ_MINUTES = 7;

const BLOCKS: ArticleBlock[] = [
  {
    type: "p",
    text: "Followers are vanity; customers pay the rent. The trap most local businesses fall into is treating Instagram like a popularity contest — more followers, more likes — when it's actually a foot-traffic engine. The goal of every post is one of three things: someone books, someone visits, or someone saves your page because they plan to. Here's how to make Instagram actually bring people through your door.",
  },
  { type: "h2", text: "Be the local expert, not the local advertiser" },
  {
    type: "p",
    text: "People follow local businesses for the personality and the usefulness, not the product shots. The businesses that win locally post about their area as much as themselves: the best quiet corner for a coffee in your neighbourhood, what to look for in a first Pilates class locally, the three mistakes people make when choosing a salon near them. When a local searches 'café near me' on Instagram, the account that shows up with genuinely useful local content gets the visit.",
  },
  { type: "h2", text: "Make every post answer a local question" },
  {
    type: "ul",
    items: [
      "'What's the best place to [do X] in [your area]?' — answer it from your own counter.",
      "'How much does [service] cost around here?' — be transparent; it builds trust and pre-qualifies buyers.",
      "'Where can I [solve a problem] on short notice?' — show your speed and convenience.",
      "'What's new in [your area]?' — seasonal menus, new classes, local events you're part of.",
    ],
  },
  { type: "h2", text: "Give people a reason to come this week" },
  {
    type: "p",
    text: "Generic content grows awareness; time-bound offers grow revenue. One offer post a week — framed around a deadline, a limited slot, or a seasonal moment — converts interest into visits:",
  },
  {
    type: "ul",
    items: [
      "'First class free this month — 4 spots left for beginners.'",
      "'Friday brunch: our soufflé pancake is back until Sunday.'",
      "'DM the word 'BOOK' and we'll hold your spot for today.'",
      "'We have 3 openings this week — usually booked out 2 weeks ahead.'",
    ],
  },
  {
    type: "tip",
    title: "Offers need a deadline to work",
    text: "A standing offer is just an ad. 'This weekend', 'first 10 people', 'before Friday' — urgency is what pushes someone from 'I'll save this post' to 'I'll walk in today'. Scarcity is honest when it's real; don't fake it.",
  },
  { type: "h2", text: "Make the path to booking obvious" },
  {
    type: "p",
    text: "Here's the mistake that kills conversions: great content, no path. Every post should make it obvious what to do next:",
  },
  {
    type: "ol",
    items: [
      "Put your booking link in your bio and reference it in captions ('link in bio to book').",
      "Use action stickers in stories — 'Book now', 'DM us', 'Get directions'.",
      "Respond to every comment that asks a question, and reply with a clear next step.",
      "On posts about your service, name the outcome: '12 spots left this month — bio link to grab one'.",
      "Collect DM inquiries into a simple routine: acknowledge instantly, confirm the details, send the booking link.",
    ],
  },
  { type: "h2", text: "Turn your best customers into content" },
  {
    type: "p",
    text: "Your existing customers are your most believable marketers. Ask a regular for 30 seconds on camera about why they keep coming back. Screenshot and repost reviews. Photograph the same customer twice — the transformation content (before/after, first visit vs regular) outperforms almost everything else locally because it's proof, not claims.",
  },
  { type: "h2", text: "Measure the right numbers" },
  {
    type: "p",
    text: "Once a month, count what matters: how many bookings or walk-ins mentioned Instagram, how many DMs turned into sales, which offer post got the most responses. Likes and follows are lagging indicators; DMs and bookings are the actual business. If your content isn't producing messages, your calls-to-action are too weak — fix that before adding more posts.",
  },
];

const FAQ: ArticleFaq[] = [
  {
    q: "How do I turn Instagram followers into paying customers?",
    a: "Post content that answers local questions, run one time-bound offer per week, and make the booking path obvious on every post and story (bio link, action stickers, clear DM replies). Track how many DMs become bookings.",
  },
  {
    q: "Should local businesses use Instagram ads?",
    a: "Ads work best after your organic content is converting. A small budget boosting your single best offer post, targeted to people within 5–10km, is the highest-ROI starting point — but fix your organic conversion path first.",
  },
  {
    q: "What's the best Instagram strategy for a small local business?",
    a: "Consistency (3–5 posts a week), local-first content (answer the questions people in your area actually ask), and a weekly offer with a deadline. Personality brings followers; offers and easy booking bring customers.",
  },
];

export default function GetMoreCustomersOnInstagram() {
  return (
    <ArticleLayout
      title={TITLE}
      description={DESCRIPTION}
      category={CATEGORY}
      date={DATE}
      readMinutes={READ_MINUTES}
      blocks={BLOCKS}
      faq={FAQ}
      ctaTitle="A 30-day plan built to bring in customers"
      ctaBody="Cloudy plans your month around your goals — more bookings, more visits, more followers — with offers and calls-to-action scheduled in, not bolted on."
      related={[
        { slug: "how-to-know-what-to-post-on-instagram-to-increase-your-views", title: "How to know what to post on Instagram to increase your views" },
        { slug: "what-to-post-when-you-have-no-ideas", title: "What to post when you have no ideas: a 30-day plan" },
        { slug: "how-often-should-a-small-business-post-on-instagram", title: "How often should a small business post on Instagram?" },
      ]}
    />
  );
}

export { SLUG };
