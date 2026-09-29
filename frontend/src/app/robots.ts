import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cafe-piza.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/menu", "/book-table", "/about", "/contact", "/privacy", "/terms"],
      disallow: ["/pos", "/kds", "/table", "/api", "/_next"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
