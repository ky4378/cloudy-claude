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
 * Placeholder for image analysis (for future vision API support).
 * For now, returns empty result.
 */
export async function analyzeMenuImage(): Promise<MenuAnalysisResult> {
  return { products: [], highlights: "" };
}
