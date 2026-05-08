import type { MetadataRoute } from "next"

const routes = ["", "/about", "/riders", "/drivers", "/advertise", "/contact", "/legal/privacy", "/legal/terms"]

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trip.example"

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }))
}
