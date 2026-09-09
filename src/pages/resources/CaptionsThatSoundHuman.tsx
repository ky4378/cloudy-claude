import { ArticleLayout, type ArticleBlock, type ArticleFaq } from "@/components/pilot/ArticleLayout";

const SLUG = "instagram-captions-that-sound-human";

const TITLE = "Instagram Captions That Sound Human, Not AI";
const DESCRIPTION =
  "Why AI-generated captions feel flat — and the exact writing rules that make your Instagram captions sound like a real person with personality. With before/after examples.";
const CATEGORY = "Copywriting";
const DATE = "August 24, 2026";
const READ_MINUTES = 6;

const BLOCKS: ArticleBlock[] = [
  {
    type: "p",
    text: "You can spot an AI caption from a mile away: the em-dash, the 'elevate your experience', the exclamation point after every sentence, the hashtags in the middle of the text. It's polished, and it's dead. Nobody trusts a brand that sounds like a press release. Here's how to write captions that sound like the person behind the counter — warm, specific, and human.",
  },
  { type: "h2", text: "Write the way you talk" },
  {
    type: "p",
    text: "Read your best captions out loud. If they don't sound like something you'd say to a customer at your counter, rewrite them. The most human captions read like a text to a friend: contractions, sentence fragments, the occasional 'honestly'. Rules matter less than rhythm. Short sentence. Then a longer one. Then the point.",
  },
  { type: "h2", text: "Kill the AI tells" },
  {
    type: "ul",
    items: [
      "Em-dashes everywhere — swap them for a full stop or a comma.",
      "'Elevate', 'unleash', 'delve', 'embark', 'seamless', 'elevate your [anything]' — delete these words entirely.",
      "Generic enthusiasm: 'Get ready to be amazed!' means nothing. Specific enthusiasm: 'This lemon tart took us three tries to get right and it was worth every one.'",
      "Perfect symmetry — humans ramble a little. One imperfect sentence makes the whole thing believable.",
      "Ending every caption with an exclamation is a tic. Most captions should end with a period.",
    ],
  },
  { type: "h2", text: "Show, don't sell" },
  {
    type: "p",
    text: "Instead of telling people your product is great, show them a moment. Compare these:",
  },
  {
    type: "ul",
    items: [
      "AI-flat: 'Experience our luxurious new matcha latte, crafted with premium ingredients to elevate your afternoon.'",
      "Human: 'We finally got matcha from a farm that doesn't make it taste like grass. It's creamy, it's a little sweet, and it's the only thing I've ordered all week.'",
      "The second one has a point of view. The first one has adjectives. Points of view are what people remember.",
    ],
  },
  { type: "h2", text: "Open with the interesting part" },
  {
    type: "p",
    text: "The first line decides whether anyone reads the rest. Instagram shows roughly two lines before 'more' — so the hook has to be specific and slightly unfinished, something people need to tap to resolve:",
  },
  {
    type: "ul",
    items: [
      "'The reason our classes are always full has nothing to do with the workouts.'",
      "'We almost didn't open this café. Here's what changed our minds.'",
      "'Three things I wish someone told me before opening a salon.'",
    ],
  },
  { type: "h2", text: "Write a voice, not a caption" },
  {
    type: "p",
    text: "The trick that makes all of this easy: define your brand's voice once, then write everything through it. If your business is playful, you're allowed to be silly. If it's premium, you're calm and specific, not loud. If it's educational, you explain like a patient teacher. The voice is a filter — every caption passes through it, so they all sound like the same person wrote them.",
  },
  {
    type: "tip",
    title: "The 5-minute human edit",
    text: "Write your caption, then do one pass where you: cut every adjective that doesn't add information, remove at least one exclamation point, shorten the first sentence by half, and add one specific detail only you would know (the 6am bake, the supplier's name, the story behind the name). That pass is the difference between 'content' and a caption people actually read.",
  },
];

const FAQ: ArticleFaq[] = [
  {
    q: "How do I know if my caption sounds like AI?",
    a: "Read it out loud. AI captions are grammatically perfect, use symmetrical sentence structures, and lean on words like 'elevate', 'seamless' and 'unleash'. If it wouldn't sound natural spoken to a customer, it reads as AI.",
  },
  {
    q: "Should I use emojis in Instagram captions?",
    a: "Use 1–3 max, where they add meaning (a ☕ next to a coffee post), not sprinkled every line. Emojis are seasoning, not the meal.",
  },
  {
    q: "How long should an Instagram caption be?",
    a: "For feed posts, 80–150 words is a strong range — enough to tell a real story, short enough to actually be read. Stories and reels need far less: one or two lines.",
  },
];

export default function CaptionsThatSoundHuman() {
  return (
    <ArticleLayout
      title={TITLE}
      description={DESCRIPTION}
      category={CATEGORY}
      date={DATE}
      readMinutes={READ_MINUTES}
      blocks={BLOCKS}
      faq={FAQ}
      ctaTitle="Captions written in your brand's voice"
      ctaBody="Cloudy learns how your business talks — your tone, your audience, your goals — and writes every caption, hook and call-to-action to match. No generic AI copy."
      related={[
        { slug: "how-to-know-what-to-post-on-instagram-to-increase-your-views", title: "How to know what to post on Instagram to increase your views" },
        { slug: "what-to-post-when-you-have-no-ideas", title: "What to post when you have no ideas: a 30-day plan" },
        { slug: "instagram-hashtags-for-small-businesses", title: "Instagram hashtags for small businesses: the local + niche method" },
      ]}
    />
  );
}

export { SLUG };
