/**
 * Menu analysis — extract products from menu text or images.
 * Uses the configured OpenAI-compatible API which supports vision.
 */

import { chatJson, chat, parseJson } from "./ai";

export interface MenuAnalysisResult {
  products: string[];
  highlights: string;
}

/**
 * Analyze menu text and extract products.
 */
export async function analyzeMenuText(menuText: string): Promise<MenuAnalysisResult> {
  if (!menuText.trim()) {
    return { products: [], highlights: "" };
  }

  try {
    const result = await chatJson<MenuAnalysisResult>(
      "You are a menu analyzer. Extract products from the provided menu text.",
      `Analyze this menu text and extract all products/dishes/beverages:

${menuText}

Return ONLY valid JSON:
{
  "products": ["Product 1", "Product 2", ...],
  "highlights": "Brief summary of specialty items"
}

Extract 5-15 key products. Be specific. Remove generic items like "Water" unless it's a specialty.`,
      { maxTokens: 1000, temperature: 0.3 },
    );

    return result || { products: [], highlights: "" };
  } catch (err) {
    console.error("Menu analysis failed:", err);
    return { products: [], highlights: "" };
  }
}

/**
 * Analyze menu image using the OpenAI-compatible API (gpt-4-turbo or gpt-4o).
 * Both support vision natively and work with base64 images.
 */
export async function analyzeMenuImage(imageBase64: string): Promise<MenuAnalysisResult> {
  if (!imageBase64 || imageBase64.length === 0) {
    console.error("Image base64 is empty");
    return { products: [], highlights: "" };
  }

  try {
    console.log("Starting menu image analysis via OpenAI API, base64 length:", imageBase64.length);

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      return { products: [], highlights: "" };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
                {
                  type: "text",
                  text: `Analyze this menu image and extract PRIMARY MENU ITEMS ONLY (not ingredients or modifications).

Understand menu structure:
- MAIN ITEMS: Titled dishes/bowls with their own descriptions (EXTRACT THESE)
- INGREDIENTS: Items listed below a main item as customization options (SKIP THESE)
- BASE OPTIONS: Drizzles, sauces, toppings as add-ons (SKIP THESE)

Return ONLY valid JSON with no markdown, code blocks, or extra text:
{
  "products": ["Main Item 1", "Main Item 2", ...],
  "highlights": "1-2 sentence summary"
}

Rules:
- Extract ONLY primary menu items (usually 5-15 items)
- Each item must be a titled dish, NOT an ingredient
- Example: Extract "Acai Bowl with Granola" NOT "Granola" alone
- Skip ingredient lists, toppings, drizzles, and modifications
- Be specific with item names
- highlights: what makes this menu unique`,
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Vision API error:", response.status, error);
        return { products: [], highlights: "" };
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error("No response content from API");
        return { products: [], highlights: "" };
      }

      console.log("API response received, parsing:", content.substring(0, 300));

      const parsed = parseJson<MenuAnalysisResult>(content);
      if (!parsed) {
        console.error("Failed to parse JSON response");
        return { products: [], highlights: "" };
      }

      if (!Array.isArray(parsed.products)) {
        console.error("Invalid response: products is not an array", parsed);
        return { products: [], highlights: "" };
      }

      const filtered = parsed.products.filter((p) => typeof p === "string" && p.trim());
      console.log("Successfully extracted", filtered.length, "products from menu image");

      return {
        products: filtered,
        highlights: typeof parsed.highlights === "string" ? parsed.highlights : "",
      };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Menu image analysis error:", errorMsg);
    return { products: [], highlights: "" };
  }
}
