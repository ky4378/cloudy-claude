import { useEffect } from "react";

/**
 * Sets the document title + meta description for the current page.
 * Used on public pages (resources, articles) so each URL has its own
 * indexable title and description instead of the generic landing meta.
 */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;

    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [title, description]);
}
