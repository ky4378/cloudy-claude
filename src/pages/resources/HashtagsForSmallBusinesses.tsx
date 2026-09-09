import { ArticleLayout, type ArticleBlock, type ArticleFaq } from "@/components/pilot/ArticleLayout";

const SLUG = "instagram-hashtags-for-small-businesses";

const TITLE = "Instagram Hashtags for Small Businesses: the Local + Niche Method";
const DESCRIPTION =
  "Stop using the same 30 generic hashtags. A repeatable system for choosing Instagram hashtags that actually reach your local customers — with a fill-in-the-blank template.";
const CATEGORY = "Instagram Strategy";
const DATE = "August 24, 2026";
const READ_MINUTES = 6;

const BLOCKS: ArticleBlock[] = [
  {
    type: "p",
    text: "#love #instagood #photooftheday #followme — if your hashtag list looks like this, you're invisible. Generic hashtags have millions of posts; yours disappears into the pile in seconds. The hashtags that actually work for a small business are the ones nobody else in your area is using. Here's the system.",
  },
  { type: "h2", text: "The 3 buckets of a working hashtag set" },
  {
    type: "p",
    text: "For every post, build a set of 15–20 hashtags from three buckets:",
  },
  {
    type: "ul",
    items: [
      "Local (5–8): your city, neighbourhood, and 'near me' phrases — #singaporecafe, #jakartapilates, #orchardlunch. This is the bucket that finds you local customers.",
      "Niche (5–8): your specific industry and audience, not the general one — #hotmatpilates, #specialtycoffee, #bridalmakeupartistry. Small enough to be findable, specific enough to be relevant.",
      "Broad (3–5): the big ones you're allowed to dream about — #pilates, #cafe, #fitness. They rarely get you discovered, but they keep your content categorized.",
    ],
  },
  { type: "h2", text: "The 3 checks before you use a hashtag" },
  {
    type: "ol",
    items: [
      "Relevance — would someone searching this hashtag actually want to see your post? If they'd be annoyed, skip it.",
      "Reachability — tap the hashtag. If the top posts have 50k+ likes and are from influencers, your post will never surface. Medium-size hashtags (posts in the thousands to tens of thousands) are where small accounts actually get found.",
      "Recency — is the hashtag currently active? A hashtag where the newest post is 3 weeks old is dead. Skip it.",
    ],
  },
  { type: "h2", text: "Steal from competitors who are winning" },
  {
    type: "p",
    text: "Find 3 local businesses similar to yours that are growing, and look at the hashtags on their best-performing posts — not the mega ones, the local and niche ones. You'll see patterns: the neighbourhood hashtag they all use, the industry tags that fit. Build your own set from those patterns. This is legitimate research, not copying — hashtags can't be owned.",
  },
  { type: "h2", text: "The fill-in-the-blank template" },
  {
    type: "p",
    text: "Once you've researched, slot your findings into this structure and reuse it across posts:",
  },
  {
    type: "ul",
    items: [
      "[Your city], [your neighbourhood], [city][industry], [neighbourhood][industry] — 4 local tags",
      "[Core service] (e.g. #hotmatpilates), [service][city], [audience tag] (e.g. #pilatesforbeginners), [style/positioning tag] — 4–6 niche tags",
      "[Seasonal or trending tag] (e.g. #springmenu, #newyearfitness) — 1–2",
      "2–3 broad industry tags — #pilates, #wellness, #fitness",
    ],
  },
  {
    type: "tip",
    title: "Rotate, don't repeat",
    text: "Use the same 20 hashtags on every post and Instagram flags you as spammy. Keep a bank of 40–60 researched hashtags and rotate sets, or customize per post. Your local tags stay consistent; the niche ones vary with the content.",
  },
  { type: "h2", text: "Where to put them" },
  {
    type: "p",
    text: "Hashtags work the same in the caption or the first comment, but the caption is cleaner for readers. Put 3–4 in the caption itself (the important local ones) and the rest in the first comment, or keep all 15–20 in the first comment for a tidy look. Test both — the difference is cosmetic, not algorithmic.",
  },
];

const FAQ: ArticleFaq[] = [
  {
    q: "How many hashtags should I use on Instagram?",
    a: "15–20 is the practical sweet spot for small businesses: mostly local and niche tags, a few broad ones. Quality of relevance matters far more than the count.",
  },
  {
    q: "Do hashtags still matter on Instagram in 2026?",
    a: "Yes, but differently than before — hashtags now work more like search keywords than discovery lottery tickets. Local and niche tags help you show up when people search, which is exactly what small businesses need.",
  },
  {
    q: "Should I use the same hashtags on every post?",
    a: "No. Repeating an identical set on every post looks spammy to Instagram. Keep a researched bank of 40–60 tags and rotate them, keeping your local tags consistent.",
  },
  {
    q: "Are generic hashtags like #love worth using?",
    a: "They don't hurt, but they rarely help a small account — you're competing with millions of posts. Spend your 20 slots on local and niche tags that actually get seen.",
  },
];

export default function HashtagsForSmallBusinesses() {
  return (
    <ArticleLayout
      title={TITLE}
      description={DESCRIPTION}
      category={CATEGORY}
      date={DATE}
      readMinutes={READ_MINUTES}
      blocks={BLOCKS}
      faq={FAQ}
      ctaTitle="Hashtags researched for your business"
      ctaBody="Cloudy generates local, niche, trending and branded hashtag sets for every post in your plan — picked for your industry and your area, not copy-pasted from a template."
      related={[
        { slug: "how-to-know-what-to-post-on-instagram-to-increase-your-views", title: "How to know what to post on Instagram to increase your views" },
        { slug: "how-to-get-more-customers-on-instagram", title: "How to get more customers on Instagram as a local business" },
        { slug: "instagram-captions-that-sound-human", title: "Instagram captions that sound human, not AI" },
      ]}
    />
  );
}

export { SLUG };
