/**
 * Cloudy — Brand Voice Profile.
 *
 * The questionnaire's "brand personality" answer is not just a label to
 * prepend to prompts. This module translates it into a set of concrete
 * writing rules (vocabulary, sentence style, CTA style, per-platform
 * adjustments) and combines it with the business's target audience, goals
 * and type so every generated piece of content speaks in one consistent
 * brand voice.
 */

import type { BusinessProfile } from "./strategy";

export type ToneId =
  | "Luxury"
  | "Professional"
  | "Funny"
  | "Educational"
  | "Friendly"
  | "Bold"
  | "Inspirational"
  | "Modern"
  | "Minimal";

interface VoiceRule {
  /** One-line description of the voice. */
  statement: string;
  /** Words/registers to weave in naturally. */
  vocabulary: string[];
  /** Styles to avoid. */
  avoid: string[];
  sentenceStyle: string;
  ctaStyle: string;
  /** How emojis should be handled. */
  emoji: "sparing" | "natural" | "playful" | "none";
  /** Per-platform adjustments so the same brand doesn't sound like two brands. */
  platform: {
    instagram: string;
    email: string;
  };
}

const VOICE_RULES: Record<ToneId, VoiceRule> = {
  Professional: {
    statement:
      "Clear, confident, polished and informative — minimal slang, maximum clarity. Sounds like a seasoned professional who knows their craft.",
    vocabulary: [
      "precise",
      "reliable",
      "experienced",
      "results",
      "expertise",
      "trusted",
      "quality",
      "consistently",
      "professional",
    ],
    avoid: [
      "excessive slang",
      "overused hype words ('crazy', 'insane', 'OMG')",
      "exclamation-mark spam",
      "gossipy or casual phrasing",
    ],
    sentenceStyle:
      "Short-to-medium declarative sentences. Direct, confident, informative. No run-ons, no hedging.",
    ctaStyle:
      "Clear and direct but never pushy — 'Book a consultation', 'See our services', 'Contact us today'.",
    emoji: "sparing",
    platform: {
      instagram:
        "Polished and confident but still human — a touch of warmth in the first line, facts and specifics after.",
      email:
        "Structured and professional — a clear subject line, scannable body, and one obvious next step.",
    },
  },
  Luxury: {
    statement:
      "Elegant, refined, sophisticated and quietly exclusive. Everything sounds considered, curated and premium.",
    vocabulary: [
      "premium",
      "elevated",
      "curated",
      "experience",
      "refined",
      "timeless",
      "craftsmanship",
      "bespoke",
      "considered",
      "wellness",
    ],
    avoid: [
      "excessive slang",
      "overly casual language",
      "aggressive sales language",
      "'🔥', 'LOL', 'DM us NOW'",
      "loud all-caps urgency",
    ],
    sentenceStyle:
      "Short-to-medium, polished and confident. Full sentences with a graceful rhythm; let spaces and pauses do the work.",
    ctaStyle:
      "Subtle and inviting rather than pushy — 'Reserve your experience', 'Discover the collection', 'An appointment, at your leisure'.",
    emoji: "sparing",
    platform: {
      instagram:
        "Polished and aspirational; describe the feeling the product or place creates, not just the thing itself.",
      email:
        "Warm and premium; an understated invitation, not a broadcast blast.",
    },
  },
  Funny: {
    statement:
      "Playful, witty and conversational — makes people smile without trying too hard. Humour lands on the product, never on the customer.",
    vocabulary: [
      "playful exaggeration",
      "light self-deprecation",
      "'obsessed'",
      "'you're welcome'",
      "a wink",
      "relatable everyday moments",
    ],
    avoid: [
      "forced jokes",
      "meme overkill",
      "sounding desperate for likes",
      "punchlines that bury the actual point",
    ],
    sentenceStyle:
      "Conversational and loose; short punchy lines. Punctuation does comedy — a well-placed ellipsis or aside.",
    ctaStyle:
      "Playful and low-pressure — a wink at the end. 'Come say hi (we'll try not to be weird about it)'.",
    emoji: "playful",
    platform: {
      instagram:
        "Witty first line to stop the scroll, then the real info, then a light CTA.",
      email:
        "Playful subject line, personable body, clear ask — never at the cost of the message.",
    },
  },
  Educational: {
    statement:
      "Helpful, informative and explanatory — teaches something genuinely useful every time. Evidence and clarity over hype.",
    vocabulary: [
      "learn",
      "understand",
      "how to",
      "step by step",
      "tip",
      "fact",
      "research",
      "results",
      "the difference between",
    ],
    avoid: [
      "fluff",
      "vague praise",
      "marketing-speak with no substance",
      "claims without evidence",
    ],
    sentenceStyle:
      "Structured and easy to scan. Clear explanations, concrete numbers and steps where possible.",
    ctaStyle:
      "Invites saving and sharing — 'Save this for later', 'Share this with someone who needs it', 'Ask us anything'.",
    emoji: "natural",
    platform: {
      instagram:
        "Carousel-friendly: a strong hook, bite-size points, a takeaway worth saving.",
      email:
        "A mini-lesson with a practical next step; sign off with an offer to answer questions.",
    },
  },
  Friendly: {
    statement:
      "Warm, approachable and conversational — like a message from a friend who happens to run the place.",
    vocabulary: [
      "we",
      "you",
      "love",
      "welcome",
      "excited",
      "happy to",
      "come say hi",
      "our little corner",
    ],
    avoid: [
      "corporate speak",
      "robotic phrasing",
      "overly formal language",
      "cold or transactional wording",
    ],
    sentenceStyle:
      "Conversational and warm; medium-length sentences with heart. Feels spoken, not written.",
    ctaStyle:
      "Inviting and kind — 'Come say hi', 'We'd love to see you', 'Pop in anytime'.",
    emoji: "natural",
    platform: {
      instagram:
        "Warm and personal; talk to the reader like a regular ('you know the drill').",
      email:
        "Friendly and personal — 'hi' not 'Dear customer'; sign off like a person.",
    },
  },
  Bold: {
    statement:
      "Confident, energetic and direct — stops the scroll and makes a statement. No hedging, no apologies.",
    vocabulary: [
      "no excuses",
      "level up",
      "stronger",
      "prove it",
      "all in",
      "unstoppable",
      "no shortcuts",
      "the result",
    ],
    avoid: [
      "wishy-washy hedges ('maybe', 'sort of')",
      "passive phrasing",
      "apology language",
      "generic filler",
    ],
    sentenceStyle:
      "Short, punchy sentences. Imperatives and declaratives. Energy without exclamation spam — conviction does the work.",
    ctaStyle:
      "Direct and urgent — 'Book now', 'Don't wait', 'Your spot is waiting', 'Start today'.",
    emoji: "sparing",
    platform: {
      instagram:
        "A bold claim or provocation up front, backed by specifics; CTA with urgency.",
      email:
        "Straight to the point; a strong subject line and a clear, unmissable action.",
    },
  },
  Inspirational: {
    statement:
      "Positive, motivating and encouraging — speaks to the feeling behind the action and believes in the reader.",
    vocabulary: [
      "you can",
      "imagine",
      "journey",
      "grow",
      "believe",
      "stronger",
      "worth it",
      "your best self",
      "first step",
    ],
    avoid: [
      "empty platitudes",
      "guilt-tripping",
      "toxic positivity",
      "pressure disguised as motivation",
    ],
    sentenceStyle:
      "Medium, flowing sentences with an emotional rhythm; speak in 'you' and keep it grounded in what's real.",
    ctaStyle:
      "Encouraging and community-building — 'Start today', 'Join us', 'Take the first step'.",
    emoji: "natural",
    platform: {
      instagram:
        "A real moment or story first, then the lift; let the message breathe.",
      email:
        "Warm and uplifting; end with belief in the reader, then one clear step.",
    },
  },
  Modern: {
    statement:
      "Fresh, current and sharp — feels native to today's feed. Trend-aware without chasing everything.",
    vocabulary: [
      "fresh",
      "new",
      "now",
      "screenshot-worthy",
      "clean",
      "aesthetic",
      "vibe",
    ],
    avoid: [
      "dated phrasing",
      "boomer energy",
      "overly salesy copy",
      "stiff formality",
    ],
    sentenceStyle:
      "Punchy, current, medium-short. Feels native to the platform it's on.",
    ctaStyle: "Slick and easy — a clean arrow, a swipe, a simple link.",
    emoji: "natural",
    platform: {
      instagram: "Aesthetic-first; clean lines, current references.",
      email: "Sleek, minimal, to the point.",
    },
  },
  Minimal: {
    statement:
      "Short, clean and unadorned. Says exactly what needs saying and stops — restraint is the brand.",
    vocabulary: [
      "just the essentials",
      "clean",
      "simple",
      "quiet",
      "no filler",
    ],
    avoid: [
      "excessive adjectives",
      "fluff",
      "stacked emojis",
      "long-winded paragraphs",
    ],
    sentenceStyle:
      "Very short sentences. Stops before the reader expects. Whitespace is part of the voice.",
    ctaStyle: "A single, plain ask — 'Visit us', 'Book', 'Link in bio'.",
    emoji: "none",
    platform: {
      instagram: "One clean visual, a sentence or two, done.",
      email: "A few lines, one link, nothing else.",
    },
  },
};

export interface BrandVoice {
  tone: ToneId;
  statement: string;
  vocabulary: string[];
  avoid: string[];
  sentenceStyle: string;
  ctaStyle: string;
  emoji: VoiceRule["emoji"];
  platform: VoiceRule["platform"];
  /** Combined context: who they serve, their goals, their type. */
  audience: string;
  goals: string[];
  businessType: string;
  businessName: string;
}

const TONE_ORDER: ToneId[] = [
  "Luxury",
  "Professional",
  "Funny",
  "Educational",
  "Friendly",
  "Bold",
  "Inspirational",
  "Modern",
  "Minimal",
];

/**
 * Turn the questionnaire answers into a structured Brand Voice Profile.
 * The first recognised personality wins (users can pick several); a
 * sensible default keeps every business covered.
 */
export const buildVoiceProfile = (profile: BusinessProfile): BrandVoice => {
  const picked: string[] = Array.isArray(profile.brandPersonality)
    ? profile.brandPersonality
    : [];
  const tone: ToneId =
    TONE_ORDER.find((t) => picked.includes(t)) ?? "Friendly";
  const rule = VOICE_RULES[tone];
  return {
    tone,
    statement: rule.statement,
    vocabulary: rule.vocabulary,
    avoid: rule.avoid,
    sentenceStyle: rule.sentenceStyle,
    ctaStyle: rule.ctaStyle,
    emoji: rule.emoji,
    platform: rule.platform,
    audience: profile.targetCustomers?.trim() || "their local customers",
    goals: Array.isArray(profile.goals) ? profile.goals : [],
    businessType: profile.businessType || "a local business",
    businessName: profile.businessName || "the business",
  };
};

/**
 * A markdown block for AI system prompts. These are hard writing rules,
 * not suggestions — the model should follow them for every caption, story,
 * script, email and CTA it writes for this business.
 */
export const voicePromptBlock = (voice: BrandVoice): string => {
  const emojiRule = {
    sparing: "Use emojis sparingly — at most one, only where it earns its place.",
    natural: "Use emojis naturally, the way a person would in a friendly message.",
    playful: "Emojis are welcome and part of the personality — use them playfully but not in every line.",
    none: "Use no emojis at all.",
  }[voice.emoji];

  return `BRAND VOICE PROFILE — the owner chose "${voice.tone}" as their brand personality. This is NOT a label to sprinkle in: treat the rules below as hard writing rules for every caption, story, script, photo prompt text and CTA you write. Keep the voice consistent across every platform — the same brand must not sound like two different companies.

- Voice: ${voice.statement}
- Vocabulary to use (weave in naturally where it fits, never stuff): ${voice.vocabulary.join(", ")}
- Avoid: ${voice.avoid.join("; ")}
- Sentence style: ${voice.sentenceStyle}
- CTA style: ${voice.ctaStyle}
- Emojis: ${emojiRule}
- Platform adjustments:
  • Instagram: ${voice.platform.instagram}
  • Email / other: ${voice.platform.email}

Write for their audience (${voice.audience}) and serve their marketing goals (${voice.goals.join(", ") || "build the brand"}) within this voice. The business type is ${voice.businessType} — the voice stays the same even when the format changes (an educational post for ${voice.businessName} is still sophisticated if the brand is Luxury).`;
};
