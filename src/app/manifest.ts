import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/data/public";

/** Web App Manifest — lets customers "Add to Home Screen" on their phones. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  const initials = settings.businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return {
    name: settings.businessName,
    short_name: settings.businessName.length <= 12 ? settings.businessName : initials || "Catalog",
    description: settings.welcomeText,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#14254a",
    categories: ["shopping", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
