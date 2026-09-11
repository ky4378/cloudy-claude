/**
 * Menu analysis — extract products from menu text.
 */

import { chatJson } from "./ai";

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
 * Analyze menu image using Claude's vision API.
 */
export async function analyzeMenuImage(imageBase64: string): Promise<MenuAnalysisResult> {
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) return { products: [], highlights: "" };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Analyze this menu image and extract all products/dishes/beverages offered.
Return ONLY valid JSON:
{
  "products": ["Product 1", "Product 2", ...],
  "highlights": "Brief summary of specialty items"
}
Extract 5-15 key products. Be specific.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Vision API error:", response.statusText);
      return { products: [], highlights: "" };
    }

    const data = await response.json() as any;
    const content = data.content?.[0]?.text;
    if (content) {
      const parsed = JSON.parse(content);
      return parsed as MenuAnalysisResult;
    }

    return { products: [], highlights: "" };
  } catch (err) {
    console.error("Menu image analysis failed:", err);
    return { products: [], highlights: "" };
  }
}
