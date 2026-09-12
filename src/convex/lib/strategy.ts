/**
 * Cloudy AI — strategy engine.
 *
 * Turns a business profile into a complete 30-day content strategy:
 * a hero post per day (platform, time, content type, goal), photo
 * instructions, Reel scripts, captions, hashtags and story ideas.
 *
 * Deterministic given (business, salt) so regenerating re-rolls cleanly.
 * Pure TypeScript — no Convex runtime imports, so the landing page can
 * use it to render a live sample plan.
 */

import { focusTheme, strategyFocus } from "./focus";

// Re-exported here (defined below) so sibling modules can build
// business-type-specific content without importing the whole engine.
export { typeKB };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentType =
  | "Reel"
  | "Carousel"
  | "Photo Post"
  | "Story Post"
  | "Video Post";

export type Platform = "Instagram";

export interface BusinessProfile {
  businessName: string;
  businessType: string; // key into BUSINESS_TYPES
  location: string;
  instagram?: string;
  website?: string;
  products: string[];
  targetCustomers: string;
  goals: string[];
  brandPersonality: string[];
  accentColor?: string;
  /** Brand brief gathered from the owner's live social profiles. */
  brandResearch?: string;
  /** Where the account sits today — drives how the plan is shaped. */
  igFollowers?: string; // under500 | 500to2k | 2kto10k | 10kplus
  postingFrequency?: string; // daily | 3to4x | 1to2x | rarely
  engagement?: string; // high | some | low
  /** Questionnaire answers that shape the strategy (all optional). */
  mainGoal?: string; // the single most important marketing goal
  differentiator?: string; // what makes the business different
  tone?: string; // Professional | Luxury | Funny | Educational | Friendly | Bold
  contentLikes?: string; // content they like / want more of
  contentDislikes?: string; // content they do not want
  challenges?: string; // their biggest marketing challenges
  competitors?: string[]; // names / handles of main competitors
}

export interface VideoScript {
  hook: string;
  scenes: string[];
  ending: string;
  music: string;
  length: string;
  textOverlays: string[];
  cameraMovement: string;
  broll: string[];
}

export interface DayPlan {
  dayIndex: number;
  date: string; // YYYY-MM-DD
  time: string;
  platform: Platform;
  contentType: ContentType;
  goal: string;
  title: string;
  subject: string;
  /** Opening line / on-screen hook for the post (first 3 seconds of a Reel, first line of a caption). */
  hook?: string;
  photoInstructions: string;
  videoScript?: VideoScript;
  captionShort: string;
  captionLong: string;
  cta: string;
  hashtagGroups: {
    local: string[];
    industry: string[];
    trending: string[];
    branded: string[];
  };
  storyIdeas: string[];
}

// ---------------------------------------------------------------------------
// Personalized plan builders
//
// buildCalendar / buildDayPlan below are the deterministic base engine
// (seeded by name + location + day + salt). These wrappers layer the
// strategy focus on top: a focus derived from the business's followers,
// posting consistency and engagement, plus focus-themed days (teaching for
// small accounts, offers for established ones, a "what makes us different"
// day when competitors are listed). Two businesses of the same type with
// different data land on different plans.
// ---------------------------------------------------------------------------

const richSeed = (biz: BusinessProfile, dayIndex: number, salt: number): string =>
  `${biz.businessName}|${biz.location}|${biz.igFollowers ?? ""}|${biz.postingFrequency ?? ""}|${biz.engagement ?? ""}|${strategyFocus(biz)}|${dayIndex}|${salt}`;

const applyFocusDay = (
  day: DayPlan,
  special: { shot: Shot; title: string; goal: string },
  biz: BusinessProfile,
  kbInfo: TypeKB,
  rng: Rng,
): DayPlan => {
  let subject = special.shot.subject;

  // Customize subject based on actual products (e.g., acai bowls instead of lattes).
  if (biz.businessType === "cafe" && biz.products.length > 0) {
    const productStr = biz.products.join(" ").toLowerCase();
    if ((productStr.includes("acai") || productStr.includes("açai")) && subject.includes("latte")) {
      subject = subject.replace(/latte|coffee|espresso/gi, (match) => {
        if (match.toLowerCase() === "latte") return "acai bowl";
        if (match.toLowerCase() === "coffee") return "acai";
        return match;
      });
    } else if (productStr.includes("tea") && subject.includes("latte")) {
      subject = subject.replace(/latte|coffee|espresso/gi, (match) => {
        if (match.toLowerCase() === "latte") return "signature tea";
        if (match.toLowerCase() === "coffee") return "tea";
        return match;
      });
    } else if (productStr.includes("smoothie") && subject.includes("latte")) {
      subject = subject.replace(/latte|coffee|espresso/gi, (match) => {
        if (match.toLowerCase() === "latte") return "smoothie bowl";
        if (match.toLowerCase() === "coffee") return "smoothie";
        return match;
      });
    }
  }

  const tone = toneFor(personalityList(biz));
  const audience = kbInfo.audience;
  const needsVideo = day.contentType === "Reel" || day.contentType === "Video Post";

  // Customize photo instructions for non-coffee cafe businesses.
  let photoInstructions = buildPhotoInstructions(special.shot);
  if (biz.businessType === "cafe" && biz.products.length > 0) {
    const productStr = biz.products.join(" ").toLowerCase();
    if (productStr.includes("acai") && photoInstructions.includes("coffee")) {
      photoInstructions = photoInstructions
        .replace(/coffee|latte|espresso/gi, "acai bowl")
        .replace(/beans|grounds/gi, "toppings")
        .replace(/barista/gi, "staff");
    }
  }

  return {
    ...day,
    goal: special.goal,
    title: special.title,
    subject,
    photoInstructions,
    videoScript: needsVideo
      ? buildReelScript(special.shot.theme, subject, biz, kbInfo, rng)
      : day.videoScript,
    captionShort: `${tone.emoji} ${subject.charAt(0).toUpperCase() + subject.slice(1)} ${tone.short(subject, biz)}`,
    captionLong: `${tone.long(subject, audience, biz, special.goal)}\n\n${rng.pick([
      "What's your take? Drop a comment below 👇",
      "Tell us in the comments — we read every single one 💬",
      "Which one is your favourite? Let us know 👇",
    ])}\n\n${ctaFor(special.goal, tone, rng)}`,
    cta: ctaFor(special.goal, tone, rng),
    storyIdeas: buildStoryIdeas(kbInfo, subject, rng),
  };
};

export const buildCalendarPersonalized = (
  biz: BusinessProfile,
  options: StrategyOptions = {},
): DayPlan[] => {
  const startDate = options.startDate ?? todayString();
  const salt = options.salt ?? 1;
  const focus = strategyFocus(biz);
  const kbInfo = typeKB(biz.businessType);
  return buildCalendar(biz, options).map((day, dayIndex) => {
    const rng = makeRng(hashString(richSeed(biz, dayIndex, salt)));
    const special = focusTheme(dayIndex, focus, kbInfo, biz, rng);
    const built = special ? applyFocusDay(day, special, biz, kbInfo, rng) : day;
    return withHook(built, biz, rng);
  });
};

/** Every post gets a hook: Reels use the script hook, everything else a caption opener. */
const withHook = (day: DayPlan, biz: BusinessProfile, rng: Rng): DayPlan => {
  if (day.hook) return day;
  if (day.videoScript?.hook) return { ...day, hook: day.videoScript.hook };
  const openers = [
    `${day.subject.charAt(0).toUpperCase() + day.subject.slice(1)} — here's the part most people miss.`,
    `If you've ever wondered about ${day.subject}, this one's for you.`,
    `A small thing we're proud of at ${biz.businessName}: ${day.subject}.`,
    `Save this before your next visit: ${day.subject}.`,
  ];
  return { ...day, hook: rng.pick(openers) };
};

export const buildDayPlanPersonalized = (
  biz: BusinessProfile,
  dayIndex: number,
  options: StrategyOptions = {},
): DayPlan =>
  buildCalendarPersonalized(biz, options)[dayIndex] ??
  buildDayPlan(biz, dayIndex, options);

export interface TypeKB {
  id: string;
  label: string;
  emoji: string;
  audience: string; // e.g. "coffee lovers and remote workers"
  typeWord: string; // e.g. "Eats" used in local hashtags
  industryHashtags: string[];
  shots: Shot[];
  tips: string[];
  offers: string[];
  storyThemes: string[];
}

export interface Shot {
  theme: string;
  subject: string;
  angle: string;
  setting: string;
  lighting: string;
  background: string;
  props: string;
  edit: string;
}

// ---------------------------------------------------------------------------
// Onboarding constants
// ---------------------------------------------------------------------------

export const GOALS = [
  { id: "Increase sales", emoji: "📈" },
  { id: "Get bookings", emoji: "📅" },
  { id: "Increase followers", emoji: "🚀" },
  { id: "Promote new products", emoji: "✨" },
  { id: "Build trust", emoji: "🤝" },
] as const;

export const PERSONALITIES = [
  { id: "Luxury", emoji: "🥂" },
  { id: "Professional", emoji: "💼" },
  { id: "Funny", emoji: "😄" },
  { id: "Educational", emoji: "🎓" },
  { id: "Friendly", emoji: "💛" },
  { id: "Bold", emoji: "🔥" },
  { id: "Inspirational", emoji: "💫" },
  { id: "Modern", emoji: "⚡" },
  { id: "Minimal", emoji: "◻️" },
] as const;

export const ACCENT_COLORS = [
  "#416557", // forest
  "#1a1a1a", // ink
  "#8a6d3b", // ochre
  "#a2543a", // terracotta
  "#6a5c8f", // stone violet
  "#4a7a8c", // steel blue
  "#7a5a3a", // caramel
] as const;

export const PLATFORM_META: Record<Platform, { label: string; short: string }> = {
  Instagram: { label: "Instagram", short: "IG" },
};

export const CONTENT_TYPE_META: Record<
  ContentType,
  { label: string; emoji: string; needsVideo: boolean }
> = {
  Reel: { label: "Reel", emoji: "🎬", needsVideo: true },
  "Video Post": { label: "Video Post", emoji: "🎥", needsVideo: true },
  Carousel: { label: "Carousel", emoji: "🖼️", needsVideo: false },
  "Photo Post": { label: "Photo Post", emoji: "📸", needsVideo: false },
  "Story Post": { label: "Story", emoji: "⏱️", needsVideo: false },
};

// ---------------------------------------------------------------------------
// Caption style guide
//
// The benchmark every generated caption is measured against: real, warm,
// human-sounding local-business captions — the "we're officially open" post
// from a small café that performed exceptionally well. Used by the plan
// generator (plan.ts) and the AI coach (coach.ts).
// ---------------------------------------------------------------------------

export const CAPTION_STYLE_GUIDE = `Write captions that feel like a real person typed them on their phone — never like an ad, an agency or an AI.

The benchmark (a small café announcing its opening — thousands of likes):
"we're officially open at beach road! 🎉🥳

for the past few months, you might've walked past our little corner wondering what was happening behind those walls. we even cut a tiny peek hole just so you could sneak a look.

now the wait is over. no more peeking from outside, come on in and say hi.

location -
big short coffee : beach road
273 beach rd, #01-01 (199548)

opening hours -
mon - thu, sun: 8am - 5pm
fri - sat: 8am - 7pm

see you soon! 🌈💙"

What makes that caption work — copy these habits:
- Open with a moment or a feeling, not a marketing line. "Exciting news!" / "We are thrilled to announce" are banned.
- Tell a tiny story with real, specific details: the peek hole, the exact address, the hours. Specificity is what sounds human.
- Let the rhythm be natural: it can be lowercase, casual, imperfect. Write like the owner is texting a friend who asked what's new.
- Emojis are used sparingly, like a person would — a couple at the start or the end, never a wall of them, never in every sentence.
- Practical info (location, hours, price, booking) is laid out plainly with simple labels ("location -", "opening hours -"), not marketing bullets.
- End with a warm invitation — "come on in and say hi", "see you soon" — not a pushy sales pitch.
- No hashtags inside the caption body.
- Emotion comes from concrete details and honest feeling, not stacked adjectives.

Banned AI-tell phrases and habits: "Exciting news!", "We're thrilled", "We are excited to announce", "Unlock", "Elevate", "Don't miss out", "In today's world", "Here are X ways", "Game-changing", "Let's dive in", "Stay tuned", "Don't forget to", exclamation-mark overload, em-dash spam, numbered lists with bold headers, generic motivational filler, and describing the post itself ("This post shows…").`;

// ---------------------------------------------------------------------------
// Knowledge base
// ---------------------------------------------------------------------------

const kb = (
  id: string,
  label: string,
  emoji: string,
  audience: string,
  typeWord: string,
  industryHashtags: string[],
  shots: Shot[],
  tips: string[],
  offers: string[],
  storyThemes: string[],
): TypeKB => ({ id, label, emoji, audience, typeWord, industryHashtags, shots, tips, offers, storyThemes });

export const BUSINESS_TYPES: TypeKB[] = [
  kb(
    "cafe",
    "Café",
    "☕",
    "coffee lovers, students and remote workers",
    "Coffee",
    ["coffee", "specialtycoffee", "latteart", "coffeelover", "baristalife", "cafeculture", "thirdwavecoffee", "coffeeaesthetic", "coffeeshop", "morningcoffee"],
    [
      { theme: "Signature drink spotlight", subject: "your signature latte", angle: "close-up at a 45° angle", setting: "held near the window counter", lighting: "soft natural window light from the side", background: "the blurred café interior and warm wood tones", props: "the drink on a saucer with a spoon and a folded napkin", edit: "warm the highlights slightly and add a subtle vignette" },
      { theme: "Latte art detail", subject: "today's latte art", angle: "direct overhead shot", setting: "flat on the wooden tabletop", lighting: "diffused daylight, no harsh shadows", background: "the wooden table with a linen napkin under the cup", props: "a few scattered coffee beans beside the saucer", edit: "bump contrast a touch and sharpen the foam detail" },
      { theme: "Pastry + coffee pairing", subject: "a croissant beside your signature latte", angle: "overhead flat-lay", setting: "on a wooden table by the window", lighting: "soft natural lighting from the left", background: "a clean linen cloth and the table edge", props: "a small plate of butter and a tiny jar of jam", edit: "add a warm filter and lift the shadows" },
      { theme: "Cozy corner of the shop", subject: "your coziest seating nook", angle: "wide shot from the doorway", setting: "showing the seating area from the entrance", lighting: "warm ambient light mixed with window daylight", background: "the full nook with plants, cushions and wall art", props: "a half-finished book and a mug left on the table", edit: "boost warmth and add a gentle glow" },
      { theme: "Barista at work", subject: "your barista pulling a shot", angle: "mid shot from a low angle", setting: "at the espresso machine during a quiet moment", lighting: "overhead bar lighting on the hands and cup", background: "the machine and shelves of beans in soft focus", props: "a portafilter and fresh grounds in the grinder", edit: "add film grain and desaturate slightly" },
      { theme: "Fresh beans close-up", subject: "the beans you roast or stock", angle: "macro close-up", setting: "in a glass jar on the counter", lighting: "side lighting that catches the oil on the beans", background: "the burlap sack and roaster in soft focus", props: "a wooden scoop with beans mid-pour", edit: "increase saturation on the beans only" },
      { theme: "Seasonal special", subject: "this month's seasonal special", angle: "45° close-up", setting: "on the bar counter", lighting: "bright even light, no flash", background: "the menu chalkboard softly blurred", props: "the special with its menu tag visible", edit: "crisp whites and vibrant drink colours" },
      { theme: "Cold brew jug pour", subject: "a slow pour of cold brew", angle: "side close-up", setting: "at the counter with the tap", lighting: "cool, clean daylight", background: "the counter and glass shelf", props: "a tall glass filling slowly with ice", edit: "make the ice sparkle, keep colours cool" },
      { theme: "Customer's hands holding a cup", subject: "hands wrapped around a warm cup", angle: "close-up from the side", setting: "by the window on a cool morning", lighting: "backlit window glow", background: "frosted window and city street blur", props: "a cinnamon-dusted cup and a knit sleeve", edit: "warm tones, dreamy softness" },
      { theme: "Window seat with a view", subject: "your best window seat", angle: "low wide shot", setting: "from across the room", lighting: "golden hour streaming through glass", background: "the street outside, softly blurred", props: "a laptop, a coffee and a notebook on the table", edit: "lift exposure on the table, deepen the street blur" },
      { theme: "Tasting flight board", subject: "a tasting flight of three brews", angle: "overhead", setting: "on a marble counter", lighting: "bright natural light", background: "the marble counter with a coffee stain ring", props: "three small glasses and tasting notes card", edit: "clean, crisp, slightly cool" },
      { theme: "Takeaway cups stacked", subject: "your branded takeaway cups", angle: "low angle looking up", setting: "stacked on the counter", lighting: "warm overhead light", background: "the menu board in soft focus", props: "a sleeve and a few lids beside the stack", edit: "slight contrast boost" },
      { theme: "What's inside the pastry case", subject: "today's pastry case lineup", angle: "eye-level from behind the glass", setting: "at the pastry counter", lighting: "the case's warm internal light", background: "the case interior", props: "tongs resting on the counter", edit: "make the glazes shine" },
    ],
    [
      "the difference between single-origin and blends",
      "how to dial in a pour-over at home",
      "why your milk choice changes the taste",
      "how to read flavour notes on a bag of beans",
      "cold brew vs iced coffee — the real difference",
      "how we pick the beans we serve",
      "the right water temperature for brewing",
      "how to store beans so they stay fresh",
      "why latte art is harder than it looks",
      "a simple at-home flat white recipe",
    ],
    [
      "your loyalty card — the fifth cup is free",
      "this week's seasonal special is live",
      "the new pastry partnership",
      "happy hour on pastries after 3 PM",
      "the signature drink most people haven't tried",
    ],
    ["Poll: hot or iced today?", "Quiz: match the roast to the region", "BTS of morning prep before opening", "Countdown to the seasonal special launch", "This or that: oat milk vs whole milk", "Question box: ask our baristas anything", "One-minute tour of the shop", "Guess the drink from the latte art"],
  ),
  kb(
    "restaurant",
    "Restaurant",
    "🍽️",
    "food lovers and local diners",
    "Eats",
    ["foodie", "foodstagram", "restaurant", "chefsofinstagram", "foodphotography", "dinnerideas", "localfood", "tastingmenu", "foodblogger", "gastropub"],
    [
      { theme: "Signature dish close-up", subject: "your signature dish", angle: "45° close-up", setting: "near the window", lighting: "natural window light", background: "the blurred dining room", props: "garnished plate with cutlery beside it", edit: "rich, appetising colour with a touch of contrast" },
      { theme: "Chef plating", subject: "the chef plating a dish", angle: "over-the-shoulder shot", setting: "at the pass in the kitchen", lighting: "bright kitchen lights", background: "the kitchen line in soft focus", props: "tweezers, a squeeze bottle and the plate", edit: "punchy, slightly warm" },
      { theme: "Sizzling pan moment", subject: "a pan still sizzling", angle: "close-up from the side", setting: "at the stove", lighting: "flame and kitchen light", background: "the range hood and tiles", props: "a pan with steam rising", edit: "boost the steam and warmth" },
      { theme: "Family-style spread", subject: "the family-style spread", angle: "overhead", setting: "on the big table", lighting: "soft evening light", background: "the whole table set with candles", props: "shared platters, plates and glasses", edit: "warm, inviting tones" },
      { theme: "Cocktail close-up", subject: "the house cocktail", angle: "low close-up", setting: "at the bar", lighting: "backlit by the bar shelf", background: "the glowing liquor bottles", props: "a coupe glass with a garnish", edit: "deepen the colours, add sparkle" },
      { theme: "Dining room mood", subject: "the dining room at dusk", angle: "wide shot", setting: "from the entrance", lighting: "dim amber + candlelight", background: "tables set for the evening", props: "folded napkins and wine glasses", edit: "cozy, film-like grain" },
      { theme: "The team", subject: "the kitchen and floor team", angle: "group shot", setting: "lined up at the pass", lighting: "bright, flattering light", background: "the kitchen behind them", props: "each holding a signature plate", edit: "natural, candid" },
      { theme: "Dessert finale", subject: "the dessert everyone orders", angle: "overhead", setting: "on a dark table", lighting: "dramatic side light", background: "dark wood and a lit candle", props: "a tasting spoon with the dessert", edit: "rich contrast, moody" },
      { theme: "Fresh ingredients", subject: "today's fresh market ingredients", angle: "flat-lay", setting: "on the prep counter", lighting: "bright daylight", background: "the wooden prep board", props: "vegetables, herbs and a chef's knife", edit: "crisp, vibrant" },
      { theme: "Window table with a view", subject: "the best table in the house", angle: "wide from outside", setting: "through the front window", lighting: "golden hour", background: "the street in front", props: "a set table waiting", edit: "glow the warm light, soft shadows" },
      { theme: "Wine pairing pour", subject: "a wine being poured", angle: "side close-up", setting: "at the table", lighting: "warm candlelight", background: "blurred guests", props: "a glass catching the pour", edit: "warm tones" },
      { theme: "Behind the pass", subject: "the kitchen pass during service", angle: "mid shot", setting: "behind the pass", lighting: "bright kitchen lights", background: "tickets lined up", props: "plates going out", edit: "authentic, documentary feel" },
      { theme: "Sunday special board", subject: "the Sunday special board", angle: "eye-level", setting: "at the entrance", lighting: "even daylight", background: "the entrance wall", props: "chalkboard with today's special", edit: "clean and clear" },
    ],
    [
      "how to pair wine with a rich dish",
      "what makes a great stock, explained simply",
      "a kitchen secret behind our signature dish",
      "how to taste food like a chef",
      "why seasonal menus taste better",
      "how we source our ingredients",
      "the right way to season at every step",
      "how to build a balanced tasting menu",
      "the science of a good sear",
      "what 'farm to table' really means",
    ],
    [
      "the new chef's special for this week",
      "weekend tasting menu — limited seats",
      "wine pairing night this Friday",
      "the family deal for Thursday evenings",
      "early-bird special before 6 PM",
    ],
    ["Poll: sweet or savoury?", "BTS: prep starts at 7 AM", "Countdown to the new tasting menu", "Question box: ask the chef", "This or that: pasta vs pizza night", "Quiz: name that ingredient", "The dish of the day — guess before the reveal", "One minute in our kitchen"],
  ),
  kb(
    "tuition",
    "Tuition Centre",
    "📚",
    "students and parents",
    "Tutoring",
    ["studygram", "studytips", "studentlife", "examseason", "education", "studymotivation", "tuition", "learnwithme", "homeschool", "academic"],
    [
      { theme: "Student success moment", subject: "a student's proud moment", angle: "warm candid", setting: "at their desk in class", lighting: "natural window light", background: "the study room", props: "a marked-up workbook and a pen", edit: "bright and encouraging" },
      { theme: "Whiteboard lesson", subject: "the whiteboard mid-lesson", angle: "straight-on", setting: "in the classroom", lighting: "even room light", background: "the whiteboard", props: "colour-coded notes and diagrams", edit: "crisp, readable" },
      { theme: "Study space", subject: "your study space", angle: "wide shot", setting: "from the doorway", lighting: "bright daylight", background: "desks, chairs and shelves", props: "open books and stationery", edit: "clean and calm" },
      { theme: "Tutor explaining", subject: "a tutor explaining a concept", angle: "mid shot", setting: "one-on-one at a desk", lighting: "soft natural light", background: "bookshelf", props: "a notebook being annotated", edit: "authentic, approachable" },
      { theme: "Progress chart", subject: "a student's progress chart", angle: "overhead", setting: "on the desk", lighting: "even light", background: "the desk surface", props: "the chart with a red pen", edit: "crisp, motivating" },
      { theme: "Class in session", subject: "a small group class in session", angle: "from the back of the room", setting: "the classroom", lighting: "warm room light", background: "students working in groups", props: "worksheets and whiteboards", edit: "candid and real" },
      { theme: "Exam countdown board", subject: "the exam countdown board", angle: "straight-on", setting: "on the classroom wall", lighting: "bright", background: "the wall", props: "the board with days marked", edit: "bold colours, clear" },
      { theme: "Revision notes flat-lay", subject: "a model set of revision notes", angle: "overhead flat-lay", setting: "on a desk", lighting: "daylight", background: "the desk", props: "colour-coded notes and highlighters", edit: "clean and tidy" },
      { theme: "Welcome pack", subject: "the new-student welcome pack", angle: "overhead", setting: "on the front desk", lighting: "bright", background: "the desk", props: "folders, timetables and a pen", edit: "fresh and organised" },
      { theme: "Quiet corner", subject: "a quiet self-study corner", angle: "wide shot", setting: "from the door", lighting: "daylight", background: "the study corner", props: "a desk, lamp and shelf", edit: "peaceful" },
      { theme: "Parent info session", subject: "the parent information evening", angle: "mid shot", setting: "the meeting room", lighting: "warm light", background: "the presentation screen", props: "chairs and handouts", edit: "clear, warm" },
      { theme: "Certificates wall", subject: "the wall of achievements", angle: "straight-on", setting: "in the hallway", lighting: "even light", background: "the wall", props: "certificates and photos", edit: "bright and proud" },
      { theme: "A question being solved", subject: "a tricky question being solved", angle: "over-the-shoulder", setting: "at the desk", lighting: "natural light", background: "the workbook", props: "a pencil circling the answer", edit: "clear focus on the page" },
    ],
    [
      "the study technique that actually works",
      "how to make a revision timetable you'll keep",
      "5 exam-day tips for staying calm",
      "how to memorise facts fast",
      "the mistake most students make with past papers",
      "how parents can support exam prep at home",
      "active recall, explained simply",
      "how to beat procrastination before it starts",
      "the best time of day to study, per subject",
      "how to turn notes into flashcards",
    ],
    [
      "the free trial class — book a seat",
      "the holiday bootcamp timetable",
      "early-bird discount on term fees",
      "the parent referral reward",
      "new small-group classes now open",
    ],
    ["Poll: maths or English first?", "Quiz: a quick question of the day", "BTS of lesson prep", "Countdown to mock exams", "This or that: study morning vs night", "Question box: ask the tutor", "One study tip in 30 seconds", "Guess the answer before we reveal it"],
  ),
  kb(
    "salon",
    "Beauty Salon",
    "💇‍♀️",
    "beauty lovers and self-care seekers",
    "Beauty",
    ["hairstylist", "hairtransformation", "beforeandafter", "salonlife", "haircolor", "balayage", "hairgoals", "beautytips", "hairstyle", "glam"],
    [
      { theme: "Before / after reveal", subject: "a client's transformation", angle: "split shot — both angles", setting: "in the styling chair", lighting: "soft, even studio light", background: "the salon mirror area", props: "a cape being removed for the reveal", edit: "show the shine, keep it natural" },
      { theme: "Stylist at work", subject: "your stylist mid-transformation", angle: "mid shot from the side", setting: "at the styling chair", lighting: "bright salon light", background: "the mirror and tools", props: "sectioning clips and a comb", edit: "crisp and professional" },
      { theme: "Colour close-up", subject: "the colour application", angle: "close-up on the foils", setting: "at the wash station", lighting: "even light", background: "the basin", props: "gloved hands and foils", edit: "rich, saturated tones" },
      { theme: "The blowout", subject: "a bouncy blowout", angle: "back view", setting: "at the styling chair", lighting: "soft light", background: "the salon interior", props: "a round brush and dryer", edit: "glossy, movement" },
      { theme: "Products used", subject: "the products used today", angle: "overhead flat-lay", setting: "on the counter", lighting: "daylight", background: "the counter", props: "bottles, brushes and a towel", edit: "clean, organised" },
      { theme: "Salon interior", subject: "your salon's interior", angle: "wide shot", setting: "from the entrance", lighting: "warm ambient light", background: "chairs, mirrors and shelving", props: "styled chairs and plants", edit: "inviting, warm" },
      { theme: "Appointment prep", subject: "the appointment area ready", angle: "eye-level", setting: "at the reception", lighting: "bright", background: "the reception desk", props: "a towel, robe and drink waiting", edit: "welcoming" },
      { theme: "Nail detail", subject: "a fresh set of nails", angle: "close-up", setting: "on the nail table", lighting: "bright even light", background: "the nail station", props: "a client's hand resting", edit: "vibrant colours" },
      { theme: "Makeup look", subject: "a full glam look", angle: "portrait close-up", setting: "at the makeup station", lighting: "soft ring light", background: "blurred mirrors", props: "a brush finishing the look", edit: "smooth and luminous" },
      { theme: "The team", subject: "the salon team", angle: "group shot", setting: "in front of the mirror wall", lighting: "bright", background: "the mirrors", props: "each with a tool of the trade", edit: "professional and fun" },
      { theme: "Wash station moment", subject: "the relaxing wash station", angle: "side shot", setting: "at the basin", lighting: "low, calm light", background: "the basin and tiles", props: "a client reclined, towel over eyes", edit: "calm, spa-like" },
      { theme: "Braids up close", subject: "detailed braiding work", angle: "macro close-up", setting: "at the styling chair", lighting: "bright light", background: "blurred hair sections", props: "hands weaving the braid", edit: "sharp detail" },
      { theme: "The reveal moment", subject: "the client seeing the result", angle: "candid side shot", setting: "in front of the mirror", lighting: "soft light", background: "the mirror", props: "the client's genuine reaction", edit: "bright, joyful" },
    ],
    [
      "how to make colour last longer at home",
      "the right way to brush wet vs dry hair",
      "how to protect hair from heat damage",
      "balayage vs highlights — the difference",
      "a simple skincare prep before any salon visit",
      "how often you actually need a trim",
      "products worth the money, and the ones to skip",
      "how to style curtain bangs at home",
      "why deep conditioning matters",
      "the truth about hair growth myths",
    ],
    [
      "the new-client discount is live",
      "colour + cut bundle — this month only",
      "bridal packages booking now",
      "product restock — the hero serum is back",
      "extended hours on Saturdays",
    ],
    ["Poll: curly or sleek today?", "Quiz: which hair colour suits you?", "BTS of the morning set-up", "Countdown to a stylist opening", "This or that: wash day vs no-wash day", "Question box: haircare questions", "One product in 30 seconds", "Guess the transformation before the reveal"],
  ),
  kb(
    "dental",
    "Dental Clinic",
    "🦷",
    "families and smile-conscious patients",
    "Dental",
    ["dentist", "smile", "oralhealth", "teethwhitening", "dentalcare", "healthysmile", "dentistry", "brushteeth", "dentalhygiene", "confidentsmile"],
    [
      { theme: "Smile transformation", subject: "a patient's smile after treatment", angle: "close-up portrait", setting: "in the treatment room", lighting: "bright, clean light", background: "the clinic interior", props: "the patient holding a mirror", edit: "bright whites, natural skin tone" },
      { theme: "Clinic tour", subject: "your modern treatment room", angle: "wide shot", setting: "from the doorway", lighting: "clean daylight", background: "the full room", props: "the chair, light and monitor", edit: "crisp, clinical and calm" },
      { theme: "Modern equipment", subject: "the equipment you use", angle: "mid close-up", setting: "beside the chair", lighting: "even light", background: "the clinic", props: "the tray with instruments", edit: "sharp and precise" },
      { theme: "Whitening demo", subject: "a shade guide comparison", angle: "close-up", setting: "on the counter", lighting: "bright", background: "the counter", props: "the shade guide beside a tooth", edit: "clear and clean" },
      { theme: "The team", subject: "your friendly team", angle: "group shot", setting: "in the reception area", lighting: "bright", background: "the reception desk", props: "each in uniform, smiling", edit: "warm and reassuring" },
      { theme: "Patient comfort", subject: "a patient relaxing in the chair", angle: "wide side shot", setting: "in the treatment room", lighting: "soft light", background: "the room", props: "the patient with headphones, relaxed", edit: "calm, comfortable feel" },
      { theme: "Kids' corner", subject: "the kids' treatment area", angle: "eye-level", setting: "the kids' room", lighting: "bright", background: "the room's décor", props: "a child-friendly chair", edit: "bright and playful" },
      { theme: "Brushing technique demo", subject: "the correct brushing angle", angle: "close-up on a model", setting: "at the demo station", lighting: "even light", background: "the model teeth", props: "a brush at the right angle", edit: "educational, clear" },
      { theme: "Reception moment", subject: "the welcome experience", angle: "wide shot", setting: "at reception", lighting: "bright", background: "the reception desk", props: "a check-in tablet and a smile", edit: "friendly" },
      { theme: "Sterilisation corner", subject: "your sterilisation station", angle: "mid shot", setting: "the prep room", lighting: "clean light", background: "the station", props: "packaged instruments", edit: "clean, trustworthy" },
      { theme: "Consultation", subject: "a gentle consultation", angle: "side candid", setting: "in the consult room", lighting: "soft light", background: "the consult desk", props: "the dentist showing an X-ray", edit: "trusting, calm" },
      { theme: "Smile close-up", subject: "a genuine healthy smile", angle: "portrait", setting: "in daylight", lighting: "natural light", background: "soft blurred background", props: "nothing — just the smile", edit: "bright and genuine" },
      { theme: "Before and after chart", subject: "a treatment plan visual", angle: "straight-on", setting: "on the screen", lighting: "even", background: "the monitor", props: "the before/after comparison", edit: "clear and honest" },
    ],
    [
      "the correct brushing technique in 60 seconds",
      "how to floss properly — and why it matters",
      "5 myths about teeth whitening, debunked",
      "when should kids first see a dentist?",
      "the foods that actually help your teeth",
      "how to stop gum bleeding at home",
      "why regular check-ups save money",
      "what to do in a dental emergency",
      "sensitive teeth — causes and fixes",
      "how long you should really brush for",
    ],
    [
      "the new-patient checkup special",
      "whitening offer for the month",
      "family appointment slots on Saturdays",
      "the kids' first visit — free consultation",
      "emergency slots open this week",
    ],
    ["Poll: morning or night brusher?", "Quiz: true or false — tooth facts", "BTS of clinic setup", "Question box: dental myths", "This or that: electric vs manual brush", "Countdown to a free checkup weekend", "One dental tip in 30 seconds", "Guess the fact — answer in stories"],
  ),
  kb(
    "gym",
    "Fitness",
    "💪",
    "fitness enthusiasts and beginners",
    "Fitness",
    ["gymlife", "fitnessmotivation", "workout", "training", "fitfam", "gymtok", "personaltrainer", "healthylifestyle", "strengthtraining", "noexcuses"],
    [
      { theme: "Workout in action", subject: "a member training hard", angle: "mid shot, dynamic angle", setting: "on the gym floor", lighting: "gym lighting with a slight edge", background: "the equipment area", props: "a barbell or dumbbells", edit: "punchy, energetic" },
      { theme: "Trainer demo", subject: "your trainer demonstrating a move", angle: "side shot showing form", setting: "in the training zone", lighting: "even light", background: "the mirrors", props: "a mat or kettlebell", edit: "crisp and instructional" },
      { theme: "Class energy", subject: "a class mid-session", angle: "wide shot", setting: "the group class room", lighting: "energising light", background: "the full class", props: "mats and bands", edit: "vibrant, motivating" },
      { theme: "Transformation", subject: "a member's transformation", angle: "split before/after", setting: "the same spot, both times", lighting: "consistent light", background: "a plain wall", props: "consistent clothing", edit: "honest, inspiring" },
      { theme: "Equipment close-up", subject: "your newest equipment", angle: "low angle", setting: "in the weights area", lighting: "dramatic gym light", background: "the rack", props: "the machine or bar loaded", edit: "sleek and modern" },
      { theme: "Morning crew", subject: "the 6 AM crew", angle: "candid wide shot", setting: "on the floor", lighting: "natural morning light", background: "the gym", props: "the crew mid-warmup", edit: "authentic" },
      { theme: "Form check", subject: "perfect squat form", angle: "side close-up", setting: "in the racks", lighting: "even light", background: "the rack", props: "a barbell at depth", edit: "sharp, instructive" },
      { theme: "Cardio zone", subject: "the cardio zone", angle: "wide shot", setting: "from the entrance", lighting: "bright", background: "the treadmills", props: "runners in motion", edit: "clean and energetic" },
      { theme: "Hydration station", subject: "your hydration and snack bar", angle: "eye-level", setting: "at the bar", lighting: "bright", background: "the shelves", props: "shakes and bottles", edit: "fresh" },
      { theme: "Stretch corner", subject: "the recovery corner", angle: "wide shot", setting: "the stretching area", lighting: "calm light", background: "the mats", props: "foam rollers and bands", edit: "calm and clean" },
      { theme: "PT session", subject: "a personal training session", angle: "over-the-shoulder", setting: "in the training zone", lighting: "gym light", background: "the floor", props: "the trainer spotting", edit: "focused" },
      { theme: "Member check-in", subject: "members checking in", angle: "candid", setting: "at the front desk", lighting: "bright", background: "the desk", props: "the check-in screen", edit: "welcoming" },
      { theme: "Finisher moment", subject: "the last rep of a finisher", angle: "close-up on effort", setting: "on the floor", lighting: "dramatic", background: "blurred gym", props: "kettlebell or battle ropes", edit: "intense, motivating" },
    ],
    [
      "the perfect squat form, explained",
      "how to build a weekly split for beginners",
      "protein basics: how much you actually need",
      "why rest days make you stronger",
      "a 10-minute home workout for busy days",
      "how to stay consistent when motivation dips",
      "the truth about spot reduction",
      "how to warm up properly before lifting",
      "cardio vs strength — what to do first",
      "how to track progress beyond the scale",
    ],
    [
      "the free trial week is open",
      "personal training packages — 2 slots left",
      "new member promo for this month",
      "refer a friend, get a free month",
      "the new group class schedule is live",
    ],
    ["Poll: morning or evening workout?", "Quiz: name the muscle", "BTS of setting up the gym", "Countdown to a free class weekend", "This or that: cardio vs weights", "Question box: ask the trainer", "One exercise in 30 seconds", "Guess the rep count"],
  ),
  kb(
    "realestate",
    "Real Estate Agent",
    "🏡",
    "home buyers, sellers and investors",
    "RealEstate",
    ["realestate", "hometour", "dreamhome", "property", "realty", "househunting", "interiordesign", "homeinspiration", "listing", "realtorlife"],
    [
      { theme: "Property tour", subject: "your newest listing", angle: "slow walkthrough", setting: "from the front door", lighting: "all lights on, bright", background: "the full room", props: "staged furniture", edit: "bright, wide, clean" },
      { theme: "Staging before/after", subject: "the staging transformation", angle: "split shot, same angle", setting: "the living room", lighting: "even light", background: "the same corner", props: "staged furniture and decor", edit: "clean and crisp" },
      { theme: "Open house", subject: "the open house", angle: "wide shot", setting: "from the entrance", lighting: "bright", background: "visitors exploring", props: "the open door and sign", edit: "welcoming" },
      { theme: "Key handover", subject: "the keys being handed over", angle: "close-up", setting: "at the front door", lighting: "natural light", background: "the new home", props: "hands exchanging keys", edit: "warm, celebratory" },
      { theme: "Neighbourhood highlight", subject: "the neighbourhood's best spot", angle: "wide shot", setting: "the local park or street", lighting: "golden hour", background: "the area", props: "a coffee or a dog", edit: "lifestyle feel" },
      { theme: "Kitchen detail", subject: "the kitchen in the new listing", angle: "45° shot", setting: "the kitchen", lighting: "bright, all lights on", background: "the cabinets and counter", props: "a fruit bowl for scale", edit: "bright, spacious" },
      { theme: "Price drop alert", subject: "the price-drop listing", angle: "straight-on", setting: "the front exterior", lighting: "daylight", background: "the house", props: "a simple graphic overlay", edit: "clean" },
      { theme: "Market update", subject: "this month's market numbers", angle: "graphic card", setting: "flat card", lighting: "clean", background: "a plain background", props: "charts and stats", edit: "professional" },
      { theme: "Client closing", subject: "a happy client at closing", angle: "candid", setting: "outside the new home", lighting: "daylight", background: "the house", props: "a 'sold' moment", edit: "joyful" },
      { theme: "Garden / outdoor space", subject: "the outdoor space", angle: "wide shot", setting: "the backyard", lighting: "daylight", background: "the garden", props: "seating or a grill", edit: "fresh and green" },
      { theme: "Staged bedroom", subject: "the staged master bedroom", angle: "wide from the door", setting: "the bedroom", lighting: "soft light", background: "the bed and windows", props: "layered linens", edit: "calm and inviting" },
      { theme: "Drive-by tour", subject: "the street and frontage", angle: "car POV", setting: "approaching the property", lighting: "daylight", background: "the street", props: "the property ahead", edit: "cinematic" },
      { theme: "Homeowner tip card", subject: "a quick home tip", angle: "graphic", setting: "flat card", lighting: "clean", background: "simple backdrop", props: "text + icon", edit: "clear" },
    ],
    [
      "5 questions to ask before buying your first home",
      "how mortgage pre-approval works",
      "the difference between list price and market value",
      "how staging helps homes sell faster",
      "rent vs buy — a simple breakdown",
      "what a home inspection actually covers",
      "how to time the market (and why not to)",
      "the hidden costs of buying a home",
      "how to make an offer that gets accepted",
      "neighbourhood guide: where your budget goes furthest",
    ],
    [
      "the new listing is live — first viewing slots open",
      "free home valuation this month",
      "open house this weekend",
      "exclusive off-market listing for followers",
      "the price-drop alert on the corner home",
    ],
    ["Poll: modern or cosy?", "Quiz: guess the listing price", "BTS of prepping a home for sale", "Countdown to open house", "This or that: city vs suburbs", "Question box: ask me about the market", "One room in 30 seconds", "Guess the square footage"],
  ),
  kb(
    "dealership",
    "Car Dealership",
    "🚗",
    "car buyers and drivers",
    "Cars",
    ["cardealership", "newcar", "carsales", "testdrive", "autos", "caroftheday", "carlifestyle", "cargram", "vehicle", "driveready"],
    [
      { theme: "Car reveal", subject: "the newest arrival", angle: "low front three-quarter", setting: "on the showroom floor", lighting: "showroom spotlights", background: "the dealership interior", props: "a detailer's cloth nearby", edit: "sleek, glossy" },
      { theme: "Test drive POV", subject: "the test drive experience", angle: "driver POV", setting: "on a scenic road", lighting: "daylight", background: "the road ahead", props: "hands on the wheel", edit: "smooth, cinematic" },
      { theme: "Interior detail", subject: "the interior tech", angle: "close-up", setting: "inside the cabin", lighting: "even light", background: "the dashboard", props: "the infotainment screen", edit: "sharp, modern" },
      { theme: "Financing explained", subject: "a simple financing card", angle: "graphic", setting: "flat card", lighting: "clean", background: "simple backdrop", props: "payment breakdown", edit: "clear, trustworthy" },
      { theme: "Trade-in offer", subject: "your trade-in special", angle: "front shot", setting: "on the lot", lighting: "daylight", background: "the lot", props: "the car with a sign", edit: "clean" },
      { theme: "Service centre", subject: "the service bay", angle: "wide shot", setting: "in the workshop", lighting: "bright workshop light", background: "the bay", props: "a car on the lift", edit: "clean, professional" },
      { theme: "Handover moment", subject: "a customer's handover", angle: "candid", setting: "at the delivery area", lighting: "daylight", background: "the new car", props: "keys and a smile", edit: "celebratory" },
      { theme: "Detail shot", subject: "the paintwork detail", angle: "macro close-up", setting: "after detailing", lighting: "reflected light", background: "the car's panel", props: "water beading on the paint", edit: "glossy" },
      { theme: "Weekend event", subject: "the weekend test-drive event", angle: "wide shot", setting: "the forecourt", lighting: "daylight", background: "the line of cars", props: "banners and balloons", edit: "energetic" },
      { theme: "Wheels close-up", subject: "the alloy wheels", angle: "low close-up", setting: "on the forecourt", lighting: "even light", background: "the car body", props: "the wheel and tyre", edit: "crisp" },
      { theme: "Team", subject: "the sales team", angle: "group shot", setting: "in front of the showroom", lighting: "daylight", background: "the showroom", props: "each by a car", edit: "professional" },
      { theme: "EV charging spot", subject: "the EV charging bay", angle: "mid shot", setting: "at the charger", lighting: "daylight", background: "the bay", props: "a car plugged in", edit: "clean, modern" },
      { theme: "Stock lineup", subject: "today's lineup", angle: "wide front shot", setting: "the forecourt", lighting: "even light", background: "the lot", props: "the row of cars", edit: "uniform, appealing" },
    ],
    [
      "how car financing actually works — simply",
      "the test-drive checklist everyone should use",
      "EV vs petrol — a practical comparison",
      "how to get the best trade-in value",
      "what your maintenance schedule should look like",
      "the hidden fees to watch for when buying",
      "how to read a car's spec sheet",
      "new vs used — which makes sense for you",
      "how to prepare your car for winter",
      "what a PPI is and why it matters",
    ],
    [
      "this month's service special is live",
      "the trade-in bonus — limited time",
      "weekend test-drive event — book a slot",
      "the new arrivals are in the showroom",
      "0% financing on selected models",
    ],
    ["Poll: EV or petrol?", "Quiz: guess the model from the grill", "BTS of prepping a new arrival", "Countdown to the weekend event", "This or that: hatchback vs SUV", "Question box: car buying questions", "One feature in 30 seconds", "Guess the price of the showroom star"],
  ),
  kb(
    "retail",
    "Retail Store",
    "🛍️",
    "shoppers and style lovers",
    "Shopping",
    ["shoplocal", "newarrivals", "ootd", "fashion", "retailtherapy", "smallbusiness", "boutique", "onlineshopping", "styleinspo", "windowshopping"],
    [
      { theme: "New arrivals", subject: "this week's new arrivals", angle: "racks-on-rack shot", setting: "the new arrivals rail", lighting: "bright store light", background: "the store interior", props: "the newest pieces on display", edit: "clean, fresh" },
      { theme: "Flat lay", subject: "a styled flat lay", angle: "overhead", setting: "on a clean surface", lighting: "daylight", background: "a neutral surface", props: "the pieces styled together", edit: "clean and curated" },
      { theme: "Product close-up", subject: "the hero product", angle: "45° close-up", setting: "on the counter", lighting: "soft light", background: "blurred store shelves", props: "the product with packaging", edit: "vibrant" },
      { theme: "In-store tour", subject: "a walkthrough of the store", angle: "slow pan", setting: "from the entrance", lighting: "all lights on", background: "the full layout", props: "displays and signage", edit: "warm, inviting" },
      { theme: "Restock alert", subject: "the restocked favourite", angle: "close-up", setting: "on the shelf", lighting: "bright", background: "the shelf", props: "the product stacked", edit: "clear" },
      { theme: "Customer styling", subject: "a customer wearing the product", angle: "full-body shot", setting: "near the mirror", lighting: "store light", background: "the store", props: "the product on a happy customer", edit: "authentic" },
      { theme: "Unboxing", subject: "the unboxing moment", angle: "overhead", setting: "on a desk", lighting: "daylight", background: "the desk", props: "the package opening", edit: "satisfying" },
      { theme: "Sale preview", subject: "the upcoming sale preview", angle: "eye-level", setting: "the sale rail", lighting: "bright", background: "the rail", props: "sale tags visible", edit: "clean" },
      { theme: "Window display", subject: "the window display", angle: "from outside", setting: "through the window", lighting: "window lighting", background: "the display", props: "the curated scene", edit: "eye-catching" },
      { theme: "Gift guide pick", subject: "a gift-guide pick", angle: "flat lay", setting: "on a clean surface", lighting: "daylight", background: "neutral backdrop", props: "the product with ribbon", edit: "gift-worthy" },
      { theme: "The team's pick", subject: "the team's favourite product", angle: "candid", setting: "in the store", lighting: "bright", background: "the store", props: "the team member holding it", edit: "personal" },
      { theme: "Shelf restock", subject: "the restock in action", angle: "behind-the-scenes", setting: "the stockroom door", lighting: "even light", background: "the back room", props: "boxes and the team", edit: "authentic" },
      { theme: "Colour story", subject: "this season's colour story", angle: "arranged flat lay", setting: "on a surface", lighting: "daylight", background: "neutral", props: "the pieces in one palette", edit: "curated" },
    ],
    [
      "how to style this season's hero piece",
      "the fabric care guide you need",
      "how to find your size — every time",
      "the minimalist capsule wardrobe, explained",
      "what's trending this month in-store",
      "how to shop a sale without overspending",
      "the difference between quality fabrics",
      "a simple gift guide by budget",
      "how to build a wardrobe around 5 pieces",
      "the restock schedule for your favourites",
    ],
    [
      "the flash sale starts Friday",
      "bundle deal: two items, one price",
      "the new collection just dropped",
      "loyalty points double this week",
      "free delivery on orders over a set amount",
    ],
    ["Poll: which colour first?", "Quiz: match the product to the price", "BTS of unboxing new stock", "Countdown to the flash sale", "This or that: two styles", "Question box: style questions", "One product in 30 seconds", "Guess the restock date"],
  ),
  kb(
    "petgroomer",
    "Pet Groomer",
    "🐾",
    "pet parents",
    "Pets",
    ["petgrooming", "dogsofinstagram", "pets", "groomer", "dogmom", "dogdad", "puppylove", "petcare", "furbaby", "doglife"],
    [
      { theme: "Before / after groom", subject: "a dramatic groom transformation", angle: "split shot", setting: "the grooming table", lighting: "even light", background: "the grooming room", props: "the same pet, before and after", edit: "show the fluff difference" },
      { theme: "Happy dog", subject: "a freshly groomed dog", angle: "portrait close-up", setting: "on the table", lighting: "soft light", background: "blurred salon", props: "a bandana as a finish", edit: "bright, joyful" },
      { theme: "Groom in action", subject: "the groom in progress", angle: "side shot", setting: "at the grooming table", lighting: "even light", background: "the salon", props: "clippers and combs", edit: "candid, skilled" },
      { theme: "Products used", subject: "the products used today", angle: "flat lay", setting: "on the counter", lighting: "daylight", background: "the counter", props: "shampoos, brushes, towels", edit: "clean" },
      { theme: "Spa setup", subject: "the bath and spa area", angle: "wide shot", setting: "the bathing station", lighting: "bright", background: "the station", props: "the tub and towels", edit: "calm, clean" },
      { theme: "Puppy first groom", subject: "a puppy's first groom", angle: "candid close-up", setting: "on the table", lighting: "soft light", background: "the salon", props: "the puppy looking curious", edit: "adorable" },
      { theme: "Seasonal cut", subject: "this season's popular cut", angle: "side profile", setting: "on the table", lighting: "even light", background: "blurred salon", props: "the finished style", edit: "crisp" },
      { theme: "Nail care detail", subject: "gentle nail care", angle: "close-up", setting: "at the table", lighting: "bright", background: "the table", props: "the paw and grinder", edit: "gentle, precise" },
      { theme: "The team with a dog", subject: "your groomer with a regular", angle: "candid", setting: "the grooming room", lighting: "bright", background: "the salon", props: "the dog mid-pose", edit: "warm" },
      { theme: "Grooming tools", subject: "the tools of the trade", angle: "macro close-up", setting: "on the counter", lighting: "daylight", background: "the counter", props: "brushes, shears, combs", edit: "sharp" },
      { theme: "Pickup moment", subject: "the pickup moment", angle: "candid", setting: "at the front", lighting: "daylight", background: "the entrance", props: "the dog running to their owner", edit: "heartwarming" },
      { theme: "Clean ears demo", subject: "gentle ear care", angle: "close-up", setting: "on the table", lighting: "bright", background: "the table", props: "the ear care product", edit: "educational" },
      { theme: "Cozy waiting spot", subject: "the waiting area", angle: "wide shot", setting: "the waiting corner", lighting: "warm light", background: "the corner", props: "beds and water bowls", edit: "calm" },
    ],
    [
      "how often should your dog actually be groomed?",
      "brushing at home — the 5-minute habit",
      "how to prevent matting between grooms",
      "what to expect at a puppy's first groom",
      "nail care at home without the stress",
      "how to spot skin issues during a groom",
      "the difference between breed cuts and comfort cuts",
      "how to make grooming day less stressful",
      "ear care basics every pet parent should know",
      "why regular grooms keep coats healthier",
    ],
    [
      "new pet client discount is live",
      "the seasonal package — book a spot",
      "refer a friend, get a discount on the next groom",
      "express grooms now available",
      "puppy packages — first groom special",
    ],
    ["Poll: which breed is in today?", "Quiz: name the dog breed", "BTS of the salon setup", "Countdown to weekend availability", "This or that: bath first or cut first?", "Question box: grooming questions", "One grooming tip in 30 seconds", "Guess the before — answer in stories"],
  ),
  kb(
    "other",
    "Other Business",
    "💼",
    "your customers and local community",
    "Local",
    ["smallbusiness", "shoplocal", "localbusiness", "supportsmall", "entrepreneur", "businessowner", "communityfirst", "smallbiz", "locallove", "growyourbusiness"],
    [
      { theme: "Product spotlight", subject: "your flagship product or service", angle: "close-up at a 45° angle", setting: "in your best-lit spot", lighting: "soft natural light", background: "a clean, branded backdrop", props: "the product with supporting props", edit: "bright and crisp" },
      { theme: "Behind the scenes", subject: "how the work gets done", angle: "candid mid shot", setting: "where the work happens", lighting: "existing light", background: "the workspace", props: "tools of the trade", edit: "authentic" },
      { theme: "The team", subject: "the people behind the business", angle: "group shot", setting: "your workspace", lighting: "bright", background: "the workspace", props: "the team at work", edit: "warm" },
      { theme: "Happy customer", subject: "a happy customer's moment", angle: "candid", setting: "with your product or service", lighting: "natural light", background: "their setting", props: "the product in their hands", edit: "bright and genuine" },
      { theme: "Before / after", subject: "a results story", angle: "split shot", setting: "the same angle twice", lighting: "consistent light", background: "a plain backdrop", props: "the transformation", edit: "clear and honest" },
      { theme: "Workspace detail", subject: "a corner of your workspace", angle: "detail shot", setting: "a favourite corner", lighting: "natural light", background: "the corner", props: "signature details", edit: "cozy" },
      { theme: "The process", subject: "a step in your process", angle: "mid shot", setting: "where it happens", lighting: "bright", background: "the workspace", props: "the step in progress", edit: "clear" },
      { theme: "Local love", subject: "a local landmark near you", angle: "wide shot", setting: "the local spot", lighting: "golden hour", background: "the landmark", props: "a nod to your business", edit: "community feel" },
      { theme: "How it works", subject: "how customers work with you", angle: "graphic / 3 steps", setting: "flat card", lighting: "clean", background: "simple backdrop", props: "3 clear steps", edit: "clean and clear" },
      { theme: "The difference", subject: "why customers choose you", angle: "graphic card", setting: "flat card", lighting: "clean", background: "simple backdrop", props: "3 differentiators", edit: "confident" },
      { theme: "In the wild", subject: "your product in the wild", angle: "lifestyle shot", setting: "a real customer setting", lighting: "natural light", background: "the real setting", props: "the product being used", edit: "authentic" },
      { theme: "Founder story", subject: "the story behind the business", angle: "portrait", setting: "your workspace", lighting: "soft light", background: "the workspace", props: "a tool or object from the story", edit: "personal" },
      { theme: "Milestone", subject: "a milestone celebration", angle: "candid", setting: "the team together", lighting: "bright", background: "the workspace", props: "a cake or banner", edit: "celebratory" },
    ],
    [
      "how to get the most out of what we offer",
      "the one thing most customers don't know about us",
      "how we choose what we stock / do",
      "a quick guide to our most popular option",
      "what makes a great customer experience",
      "how we keep quality consistent",
      "the story of how we started",
      "how to reach us when you need us",
      "what we're working on next",
      "how we give back to the local community",
    ],
    [
      "this month's special is live",
      "new customers get a welcome offer",
      "the referral programme is open",
      "our new opening hours",
      "a limited-time bundle on the favourites",
    ],
    ["Poll: what should we do next?", "Quiz: how well do you know us?", "BTS of a typical day", "Countdown to a launch", "This or that: two options", "Question box: ask us anything", "One minute in our day", "Guess the next announcement"],
  ),
];

const typeKB = (id: string): TypeKB =>
  BUSINESS_TYPES.find((b) => b.id === id) ?? BUSINESS_TYPES[BUSINESS_TYPES.length - 1];

// ---------------------------------------------------------------------------
// Seeded random
// ---------------------------------------------------------------------------

const hashString = (str: string): number => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

interface Rng {
  next: () => number;
  int: (max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  pickN: <T>(arr: readonly T[], n: number) => T[];
  shuffle: <T>(arr: readonly T[]) => T[];
}

const makeRng = (seed: number): Rng => {
  const rand = mulberry32(seed);
  const next = () => rand();
  const int = (max: number) => Math.floor(next() * max);
  const pick = <T,>(arr: readonly T[]): T => arr[int(arr.length)];
  const pickN = <T,>(arr: readonly T[], n: number): T[] => {
    const copy = [...arr];
    const out: T[] = [];
    for (let i = 0; i < Math.min(n, copy.length); i++) {
      const idx = int(copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  };
  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  return { next, int, pick, pickN, shuffle };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "");

const camelCity = (location: string) =>
  location
    .split(/[\s,-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");

export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const todayString = (): string => formatDate(new Date());

const TIME_SLOTS = {
  reel: ["6:30 PM", "8:00 PM", "7:00 PM", "12:00 PM"],
  carousel: ["12:00 PM", "4:00 PM", "2:00 PM", "6:00 PM"],
  photo: ["11:00 AM", "3:00 PM", "1:00 PM", "5:00 PM"],
  story: ["9:00 AM", "10:00 AM", "8:00 AM", "4:30 PM"],
};

// ---------------------------------------------------------------------------
// Tone helpers
// ---------------------------------------------------------------------------

interface Tone {
  emoji: string;
  short: (subject: string, biz: BusinessProfile) => string;
  long: (subject: string, audience: string, biz: BusinessProfile, goal: string) => string;
  ctaModifier: (cta: string) => string;
}

/** The preferred tone (single-select) wins; brand personality tags follow. */
export const personalityList = (biz: BusinessProfile): string[] => [
  ...(biz.tone ? [biz.tone] : []),
  ...(Array.isArray(biz.brandPersonality) ? biz.brandPersonality : []),
];

const toneFor = (personalities: string[]): Tone => {
  const p = personalities.map((x) => x.toLowerCase());
  if (p.includes("luxury")) {
    return {
      emoji: "✨",
      short: (s) => `${s} — refined, considered, unforgettable.`,
      long: (s, a, biz) =>
        `There's a quiet kind of magic in the details at ${biz.businessName}, and ${s} is where it shows. Crafted for ${a} who notice the difference.`,
      ctaModifier: (cta) => `${cta}`,
    };
  }
  if (p.includes("funny")) {
    return {
      emoji: "😄",
      short: (s) => `${s} — and yes, we're as obsessed as you are 😅`,
      long: (s, a, biz) =>
        `Okay but hear us out: ${s}. We've tested it, we've loved it, we've probably photographed it more than our own families. ${a.charAt(0).toUpperCase() + a.slice(1)} — you're welcome.`,
      ctaModifier: (cta) => `${cta} (we'll wait 😉)`,
    };
  }
  if (p.includes("professional")) {
    return {
      emoji: "💼",
      short: (s) => `${s} — done properly, every time.`,
      long: (s, a, biz) =>
        `At ${biz.businessName}, we hold a simple standard: ${s}. It's why ${a} choose us and why they keep coming back.`,
      ctaModifier: (cta) => `${cta}`,
    };
  }
  if (p.includes("educational")) {
    return {
      emoji: "🎓",
      short: (s) => `Here's the thing about ${s}…`,
      long: (s, a, biz) =>
        `Quick lesson from ${biz.businessName}: ${s}. Understanding this is how ${a} get the best results — save this post for the next time you need it.`,
      ctaModifier: (cta) => `${cta} — save this for later`,
    };
  }
  if (p.includes("minimal")) {
    return {
      emoji: "◻️",
      short: (s) => `${s}.`,
      long: (s, a, biz) => `${s}.\n\n${biz.businessName}. ${a
        .charAt(0)
        .toUpperCase()}${a.slice(1)}.`,
      ctaModifier: (cta) => `${cta}`,
    };
  }
  if (p.includes("modern")) {
    return {
      emoji: "⚡",
      short: (s) => `${s} — take the first 30 seconds to look.`,
      long: (s, a, biz) =>
        `${s} 🫡 ${biz.businessName} keeps it fresh for ${a} — screenshot-worthy, every single day.`,
      ctaModifier: (cta) => `${cta} →`,
    };
  }
  // friendly (default)
  return {
    emoji: "💛",
    short: (s) => `${s} — we couldn't be prouder of this one!`,
    long: (s, a, biz) =>
      `A little moment from ${biz.businessName} we had to share: ${s}. Made for ${a}, with a lot of care and a lot of heart.`,
    ctaModifier: (cta) => `${cta} 💛`,
  };
};

// ---------------------------------------------------------------------------
// Captions, CTA, hashtags
// ---------------------------------------------------------------------------

const CTA_BY_GOAL: Record<string, string[]> = {
  "Increase sales": ["Order today — link in bio", "DM to order yours", "Grab it while it lasts"],
  "Get bookings": ["Book now — link in bio", "Reserve your spot today", "Slots are limited — book early"],
  "Increase followers": ["Follow for more like this", "Share this to your story", "Tag a friend who needs this"],
  "Promote new products": ["Be first to try it", "Now available — come see it", "Swipe up to get yours"],
  "Build trust": ["Save this for later", "Share with someone who'd love this", "Comment your thoughts below"],
};

const ctaFor = (goal: string, tone: Tone, rng: Rng): string =>
  tone.ctaModifier(rng.pick(CTA_BY_GOAL[goal] ?? CTA_BY_GOAL["Increase sales"]));

const TRENDING_HASHTAGS = [
  "#reelsinstagram", "#explorepage", "#viralpost", "#contentcreator",
  "#smallbusiness", "#shoplocal", "#trending", "#foryou",
  "#localbusiness", "#supportsmall", "#newpost", "#instagramgrowth",
];

const localHashtags = (biz: BusinessProfile, kbInfo: TypeKB, rng: Rng): string[] => {
  const city = camelCity(biz.location || "Local");
  const cityLower = slugify(biz.location || "local");
  const base = [
    `#${city}`,
    `#${cityLower}${kbInfo.typeWord}`,
    `#${city}Local`,
    `#Visit${city}`,
    `#${cityLower}business`,
    `#${kbInfo.typeWord}In${city}`,
  ];
  return rng.pickN(base, 4);
};

const brandedHashtags = (biz: BusinessProfile): string[] => {
  const brand = slugify(biz.businessName);
  return [`#${brand}`, `#${brand}Love`, `#${brand}Community`];
};

// ---------------------------------------------------------------------------
// Reel script builder
// ---------------------------------------------------------------------------

const buildReelScript = (
  theme: string,
  subject: string,
  biz: BusinessProfile,
  kbInfo: TypeKB,
  rng: Rng,
): VideoScript => {
  const hooks = [
    `POV: you walk into ${biz.businessName} for the first time…`,
    `Stop scrolling — ${subject} just got better.`,
    `Nobody talks about this, but ${subject} is the real deal.`,
    `We did the thing. ${subject}, but make it ${rng.pick(["iconic", "unforgettable", "effortless"])}.`,
  ];
  const endings = [
    `End with a slow push-in on ${subject} and a screen card: "${biz.businessName} — ${rng.pick(["see you soon", "your new favourite", "come say hi"])}."`,
    `End on a smile / logo card + "Link in bio to learn more."`,
    `End with a quick flash of ${subject} and the CTA card: "Save this for your next visit."`,
  ];
  const brollIdeas = [
    `Close-ups of the details of ${subject}`,
    `Hands preparing / packaging ${subject}`,
    `A wide shot of the space at ${kbInfo.audience}`,
    `A customer reaction shot`,
    `Ambient shots of the neighbourhood around the business`,
    `Textured shots — materials, surfaces, steam, movement`,
  ];
  return {
    hook: rng.pick(hooks),
    scenes: [
      `Scene 1 — The hook (0-3s): ${rng.pick([
        `Fast cut to the most striking angle of ${subject}.`,
        `Start mid-action, then freeze-frame with the hook text.`,
        `Open on a mystery detail of ${subject}, cut to full reveal.`,
      ])}`,
      `Scene 2 — The substance (3-15s): ${rng.pick([
        `Show ${subject} from a second angle while text lists the top 3 reasons to care.`,
        `Split-screen: the expectation vs the reality of ${subject}.`,
        `Show a quick process / transformation related to ${subject}.`,
      ])}`,
      `Scene 3 — The proof (15-22s): ${rng.pick([
        `A customer moment with ${subject} — genuine and unscripted.`,
        `Overlay quick facts or stats about ${subject}.`,
        `B-roll montage of the details, cut to the beat.`,
      ])}`,
    ],
    ending: rng.pick(endings),
    music: rng.pick([
      "Upbeat trending instrumental — search 'upbeat summer' or 'cozy vibes' in the audio library",
      "Lo-fi hip-hop — search 'lofi study' for a calm, premium feel",
      "High-energy pop beat — search 'trending audio' and pick the one under 30s",
      "Soft acoustic — search 'warm acoustic' for a heartfelt tone",
    ]),
    length: "15-30 seconds",
    textOverlays: [
      `Hook text: "${rng.pick(["Wait for it…", "This is your sign", "POV: best decision"])}"`,
      `Middle text: "${rng.pick(["Trust the process", "Details matter", "Save this"])}"`,
      `CTA text: "${rng.pick(["Book now — link in bio", "Tag someone who needs this", "Visit us this week"])}"`,
    ],
    cameraMovement: rng.pick([
      "Handheld tracking shot that moves with the subject, then a slow push-in at the end",
      "Tripod wide shot for stability, then punch-in zoom for emphasis",
      "Slow pan from left to right, ending on the subject",
      "Gimbal glide-in for a smooth, premium feel",
    ]),
    broll: rng.pickN(brollIdeas, 3),
  };
};

// ---------------------------------------------------------------------------
// Story ideas
// ---------------------------------------------------------------------------

const buildStoryIdeas = (kbInfo: TypeKB, subject: string, rng: Rng): string[] => {
  const generic = [
    `Poll: ${rng.pick(["yes or no?", "what do you think?"])} — make it about ${subject}`,
    `Question box: "Ask us anything about ${subject}"`,
    `Quiz: 3 options, reveal the answer in the next slide`,
    `Countdown: ${rng.pick(["2 days", "3 days", "5 days"])} until the next announcement`,
    `This or that: two versions of ${subject}`,
    `Behind-the-scenes: one reel of the prep behind ${subject}`,
  ];
  const specific = kbInfo.storyThemes.map((t) =>
    t.replace("the seasonal special", subject).replace("the dish", subject).replace("a subject", subject),
  );
  return rng.pickN([...generic, ...specific], 3);
};

// ---------------------------------------------------------------------------
// Photo instructions
// ---------------------------------------------------------------------------

const buildPhotoInstructions = (shot: Shot): string =>
  `Take a ${shot.angle} of ${shot.subject} ${shot.setting}. ` +
  `Lighting: ${shot.lighting}. ` +
  `Background: ${shot.background}. ` +
  `Props: ${shot.props}. ` +
  `Edit: ${shot.edit}.`;

// ---------------------------------------------------------------------------
// The 30-day plan
// ---------------------------------------------------------------------------

export interface StrategyOptions {
  startDate?: string; // YYYY-MM-DD
  salt?: number;
}

const CONTENT_PATTERN: ContentType[] = [
  "Reel", "Carousel", "Photo Post", "Reel", "Carousel", "Photo Post", "Story Post",
];

const buildDay = (
  dayIndex: number,
  biz: BusinessProfile,
  kbInfo: TypeKB,
  startDate: string,
  salt: number,
): DayPlan => {
  const seed = hashString(`${biz.businessName}|${biz.location}|${dayIndex}|${salt}`);
  const rng = makeRng(seed);

  const contentType = CONTENT_PATTERN[dayIndex % CONTENT_PATTERN.length];
  const goal = biz.goals.length > 0 ? biz.goals[dayIndex % biz.goals.length] : "Increase sales";
  const tone = toneFor(personalityList(biz));

  // Cloudy is Instagram-only — every post is scheduled for Instagram.
  const platform: Platform = "Instagram";

  const time =
    contentType === "Reel" || contentType === "Video Post"
      ? rng.pick(TIME_SLOTS.reel)
      : contentType === "Carousel"
        ? rng.pick(TIME_SLOTS.carousel)
        : contentType === "Photo Post"
          ? rng.pick(TIME_SLOTS.photo)
          : rng.pick(TIME_SLOTS.story);

  // Pick a shot theme from the type pool, then pad with generic themes.
  let pool: { theme: string; subject: string; angle: string; setting: string; lighting: string; background: string; props: string; edit: string; kb: TypeKB }[] = [
    ...kbInfo.shots.map((s) => ({ ...s, kb: kbInfo })),
    ...BUSINESS_TYPES[BUSINESS_TYPES.length - 1].shots.map((s) => ({ ...s, kb: kbInfo })),
  ];

  // For cafes: filter out coffee-specific shots if business doesn't sell coffee.
  // This works for ANY non-coffee cafe (acai, bubble tea, matcha, juice bars, smoothie bowls, etc).
  if (biz.businessType === "cafe" && biz.products.length > 0) {
    const productStr = biz.products.join(" ").toLowerCase();
    const hasCoffee =
      productStr.includes("coffee") ||
      productStr.includes("latte") ||
      productStr.includes("espresso") ||
      productStr.includes("cappuccino") ||
      productStr.includes("americano") ||
      productStr.includes("mocha") ||
      productStr.includes("macchiato");

    // If products don't mention any coffee keywords, filter out coffee-centric shots.
    // This automatically handles acai bowls, bubble tea, matcha, juice bars, smoothies, etc.
    if (!hasCoffee) {
      const coffeeShots = new Set([
        "Signature drink spotlight",
        "Latte art detail",
        "Pastry + coffee pairing",
        "Barista at work",
        "Fresh beans close-up",
        "Cold brew jug pour",
        "Tasting flight board",
        "Takeaway cups stacked",
      ]);
      pool = pool.filter((s) => !coffeeShots.has(s.theme));
    }
  }

  const shot = pool[dayIndex % pool.length];
  let subject = shot.subject;

  const title =
    dayIndex % 7 === 0
      ? `${kbInfo.emoji} ${shot.theme}`
      : dayIndex % 5 === 0
        ? rng.pick(kbInfo.tips)
        : shot.theme;

  const date = new Date(`${startDate}T00:00:00`);
  date.setDate(date.getDate() + dayIndex);

  const videoScript =
    contentType === "Reel" || contentType === "Video Post"
      ? buildReelScript(shot.theme, subject, biz, kbInfo, rng)
      : undefined;

  const cta = ctaFor(goal, tone, rng);
  const audience = kbInfo.audience;

  const captionShort = `${tone.emoji} ${subject.charAt(0).toUpperCase() + subject.slice(1)} ${tone.short(subject, biz)}`;
  const captionLong = `${tone.long(subject, audience, biz, goal)}\n\n${rng.pick([
    "What's your take? Drop a comment below 👇",
    "Tell us in the comments — we read every single one 💬",
    "Which one is your favourite? Let us know 👇",
  ])}\n\n${cta}`;

  const hashtagGroups = {
    local: localHashtags(biz, kbInfo, rng),
    industry: rng.pickN(kbInfo.industryHashtags, 6).map((h) => `#${h}`),
    trending: rng.pickN(TRENDING_HASHTAGS, 5),
    branded: brandedHashtags(biz),
  };

  return {
    dayIndex,
    date: formatDate(date),
    time,
    platform,
    contentType,
    goal,
    title,
    subject,
    photoInstructions: buildPhotoInstructions(shot),
    videoScript,
    captionShort,
    captionLong,
    cta,
    hashtagGroups,
    storyIdeas: buildStoryIdeas(kbInfo, subject, rng),
  };
};

export const buildCalendar = (
  biz: BusinessProfile,
  options: StrategyOptions = {},
): DayPlan[] => {
  const startDate = options.startDate ?? todayString();
  const salt = options.salt ?? 1;
  const kbInfo = typeKB(biz.businessType);
  return Array.from({ length: 30 }, (_, i) => buildDay(i, biz, kbInfo, startDate, salt));
};

export const buildDayPlan = (
  biz: BusinessProfile,
  dayIndex: number,
  options: StrategyOptions = {},
): DayPlan => {
  const startDate = options.startDate ?? todayString();
  const salt = options.salt ?? 1;
  return buildDay(dayIndex, biz, typeKB(biz.businessType), startDate, salt);
};

// ---------------------------------------------------------------------------
// Sample profile for the landing page demo
// ---------------------------------------------------------------------------

export const SAMPLE_CAFE: BusinessProfile = {
  businessName: "Corner & Bean",
  businessType: "cafe",
  location: "Portland",
  instagram: "@cornerandbean",
  products: ["Signature lattes", "Fresh pastries", "Single-origin beans"],
  targetCustomers: "Coffee lovers, students and remote workers",
  goals: ["Increase followers", "Get bookings", "Promote new products"],
  brandPersonality: ["Friendly", "Modern"],
  tone: "Friendly",
  mainGoal: "Increase followers",
  igFollowers: "500to2k",
  postingFrequency: "1to2x",
  engagement: "some",
  accentColor: "#214D3C",
};

export const samplePlan = buildCalendarPersonalized(SAMPLE_CAFE, {
  startDate: todayString(),
  salt: 7,
});
