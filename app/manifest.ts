import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "Physcratic",
    description: SITE.description,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#141416",
    theme_color: "#141416",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon-dark-32x32.png", sizes: "32x32", type: "image/png" },
    ],
  };
}
