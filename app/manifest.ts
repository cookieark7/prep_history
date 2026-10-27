import type { MetadataRoute } from "next";
import { THEME_COLORS } from "@/lib/theme-colors";

// Installable on a phone's home screen (docs/PROTOTYPE_PLAN.md, section 9): the daily review
// lives there. Opens on /start, which shows what's due before anything new.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chronicle",
    short_name: "Chronicle",
    description: "Learn history as cause and consequence, and keep it with a short daily review.",
    start_url: "/start",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLORS.light,
    theme_color: THEME_COLORS.light,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
