import { useLayoutEffect } from "react";

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.cloudyco.cloud/</loc><priority>1.0</priority></url>
  <url><loc>https://www.cloudyco.cloud/about</loc><priority>0.8</priority></url>
  <url><loc>https://www.cloudyco.cloud/privacy</loc><priority>0.5</priority></url>
  <url><loc>https://www.cloudyco.cloud/terms</loc><priority>0.5</priority></url>
  <url><loc>https://www.cloudyco.cloud/resources</loc><priority>0.8</priority></url>
  <url><loc>https://www.cloudyco.cloud/resources/how-to-know-what-to-post-on-instagram-to-increase-your-views</loc><priority>0.7</priority></url>
  <url><loc>https://www.cloudyco.cloud/resources/what-to-post-when-you-have-no-ideas</loc><priority>0.7</priority></url>
  <url><loc>https://www.cloudyco.cloud/resources/how-often-should-a-small-business-post-on-instagram</loc><priority>0.7</priority></url>
  <url><loc>https://www.cloudyco.cloud/resources/instagram-captions-that-sound-human</loc><priority>0.7</priority></url>
  <url><loc>https://www.cloudyco.cloud/resources/how-to-get-more-customers-on-instagram</loc><priority>0.7</priority></url>
  <url><loc>https://www.cloudyco.cloud/resources/instagram-hashtags-for-small-businesses</loc><priority>0.7</priority></url>
</urlset>`;

/**
 * Serves /sitemap.xml. The `public/` folder is locked on this platform so
 * static files can't be added there; instead this route replaces the document
 * with the raw XML, which Google fetches and parses as a sitemap.
 */
export default function SitemapXml() {
  useLayoutEffect(() => {
    if (document.documentElement.getAttribute("data-cloudy-doc") === "sitemap") {
      return;
    }
    document.documentElement.setAttribute("data-cloudy-doc", "sitemap");
    document.open();
    document.write(SITEMAP_XML);
    document.close();
  }, []);
  return null;
}
