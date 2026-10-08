import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/order/", "/search"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
