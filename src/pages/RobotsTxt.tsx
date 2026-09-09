import { useLayoutEffect } from "react";

const ROBOTS_TXT = `User-agent: *
Allow: /
Sitemap: https://cloudyco.cloud/sitemap.xml`;

/**
 * Serves /robots.txt. The `public/` folder is locked on this platform so
 * static files can't be added there; instead this route replaces the document
 * with the plain text. Google parses robots.txt from the body regardless of
 * content-type.
 */
export default function RobotsTxt() {
  useLayoutEffect(() => {
    if (document.documentElement.getAttribute("data-cloudy-doc") === "robots") {
      return;
    }
    document.documentElement.setAttribute("data-cloudy-doc", "robots");
    document.open();
    document.write(ROBOTS_TXT);
    document.close();
  }, []);
  return null;
}
