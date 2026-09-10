/**
 * Fetch live trends from Instagram, TikTok, and third-party APIs.
 * Used to inject real-time trending content into plan generation.
 */

export interface LiveTrends {
  audios: string[]; // trending audio/music titles
  reels: string[]; // trending reel scripts/ideas
  hashtags: string[]; // trending hashtags
  themes: string[]; // trending content themes
  topics: string[]; // trending topics/niches
}

/**
 * Fetch trending hashtags from a third-party trends API (e.g., RapidAPI Trends24).
 * Returns top hashtags for a given niche.
 */
async function fetchTrendingHashtags(businessType: string): Promise<string[]> {
  try {
    const apiKey = process.env.TRENDS_API_KEY;
    if (!apiKey) return [];

    const response = await fetch(
      `https://trends24-api.p.rapidapi.com/v1/trending?country=US&category=${businessType}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "trends24-api.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) return [];
    const data = (await response.json()) as { trends?: Array<{ hashtag?: string }> };
    return (data.trends ?? [])
      .slice(0, 15)
      .map((t) => t.hashtag ?? "")
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Fetch trending reels/scripts by simulating common reel patterns.
 * In production, this could integrate with TikTok's API or trend scraping.
 */
function fetchTrendingReelScripts(businessType: string): string[] {
  const reelTemplates: Record<string, string[]> = {
    cafe: [
      "POV: Your coffee order just changed your entire day",
      "That first sip of morning coffee hits different",
      "Before and after: Coffee shop aesthetic check",
      "Latte art fail but make it adorable",
      "Coffee shop owner shows their daily routine",
    ],
    restaurant: [
      "Satisfying food prep ASMR",
      "Mukbang: Taste test our signature dish",
      "Restaurant walkthrough at opening",
      "Chef's special preparation",
      "Customer reactions to our food",
    ],
    salon: [
      "Hair transformation before and after",
      "ASMR haircut/styling sounds",
      "Color correction success story",
      "Trending hairstyle tutorial",
      "Client testimonial transformation",
    ],
    ecommerce: [
      "Unboxing experience",
      "Product styling shots",
      "How we make our products",
      "Customer unboxing reaction",
      "Haul and review",
    ],
  };

  return reelTemplates[businessType] ?? reelTemplates.ecommerce;
}

/**
 * Fetch trending audio/music titles (would integrate with TikTok in production).
 * For now, returns popular audio categories.
 */
function fetchTrendingAudios(): string[] {
  return [
    "Trending upbeat track",
    "Trending trending audio",
    "Viral sound effect",
    "Background music - uplifting",
    "Catchy hook audio",
    "ASMR ambient sound",
    "Motivational track",
    "Feel-good music",
  ];
}

/**
 * Fetch trending themes based on business type.
 */
function fetchTrendingThemes(businessType: string): string[] {
  const themes: Record<string, string[]> = {
    cafe: [
      "Coffee culture moments",
      "Cozy aesthetic",
      "Morning rituals",
      "Latte art showcase",
      "Local community vibes",
    ],
    restaurant: [
      "Food quality focus",
      "Chef expertise",
      "Ingredient sourcing",
      "Customer satisfaction",
      "Local/seasonal themes",
    ],
    salon: [
      "Beauty transformation",
      "Self-care routine",
      "Trend-setting styles",
      "Confidence boost",
      "Personalized service",
    ],
    ecommerce: [
      "Product quality",
      "Customer stories",
      "Behind-the-scenes",
      "Sustainability",
      "Innovation",
    ],
  };

  return themes[businessType] ?? themes.ecommerce;
}

/**
 * Fetch trending topics by niche/industry.
 */
function fetchTrendingTopics(businessType: string): string[] {
  const topics: Record<string, string[]> = {
    cafe: [
      "Specialty coffee brewing",
      "Coffee health benefits",
      "Latte art",
      "Barista skills",
      "Coffee pairing",
    ],
    restaurant: [
      "Food sustainability",
      "Farm-to-table",
      "Signature recipes",
      "Dietary accommodations",
      "Local ingredients",
    ],
    salon: [
      "Hair care routines",
      "Color trends",
      "Cut techniques",
      "Product recommendations",
      "Self-expression through style",
    ],
    ecommerce: [
      "Product features",
      "Customer testimonials",
      "New arrivals",
      "Sustainability practices",
      "Brand story",
    ],
  };

  return topics[businessType] ?? topics.ecommerce;
}

/**
 * Fetch all live trends for a business type.
 * Combines data from multiple sources into a single trends package.
 */
export async function fetchLiveTrends(businessType: string): Promise<LiveTrends> {
  const [hashtags, audios, reels, themes, topics] = await Promise.allSettled([
    fetchTrendingHashtags(businessType),
    Promise.resolve(fetchTrendingAudios()),
    Promise.resolve(fetchTrendingReelScripts(businessType)),
    Promise.resolve(fetchTrendingThemes(businessType)),
    Promise.resolve(fetchTrendingTopics(businessType)),
  ]);

  return {
    hashtags: hashtags.status === "fulfilled" ? hashtags.value : [],
    audios: audios.status === "fulfilled" ? audios.value : [],
    reels: reels.status === "fulfilled" ? reels.value : [],
    themes: themes.status === "fulfilled" ? themes.value : [],
    topics: topics.status === "fulfilled" ? topics.value : [],
  };
}

/**
 * Format trends into a prompt block for the AI to naturally incorporate.
 */
export function formatTrendsPrompt(trends: LiveTrends): string {
  if (!trends.hashtags.length && !trends.reels.length && !trends.themes.length) {
    return "";
  }

  const sections: string[] = [];

  if (trends.reels.length > 0) {
    sections.push(
      `TRENDING REEL IDEAS AND SCRIPTS (use 2-3 of these naturally):\n${trends.reels.slice(0, 8).map((r) => `- ${r}`).join("\n")}`
    );
  }

  if (trends.themes.length > 0) {
    sections.push(
      `TRENDING CONTENT THEMES (weave 1-2 into the plan):\n${trends.themes.slice(0, 6).map((t) => `- ${t}`).join("\n")}`
    );
  }

  if (trends.topics.length > 0) {
    sections.push(
      `TRENDING TOPICS (incorporate 1-2 per week):\n${trends.topics.slice(0, 6).map((t) => `- ${t}`).join("\n")}`
    );
  }

  if (trends.audios.length > 0) {
    sections.push(
      `TRENDING AUDIO STYLES (for Reels and Video Posts):\n${trends.audios.slice(0, 4).map((a) => `- ${a}`).join("\n")}`
    );
  }

  if (trends.hashtags.length > 0) {
    sections.push(
      `TRENDING HASHTAGS (add 2-3 per post in trending group):\n${trends.hashtags.slice(0, 10).join(" ")}`
    );
  }

  return `\n${sections.join("\n\n")}\n`;
}
