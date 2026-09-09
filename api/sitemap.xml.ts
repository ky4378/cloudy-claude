import { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
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

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.status(200).send(sitemap);
}
