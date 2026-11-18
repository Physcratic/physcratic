import { brandPreview } from "@/lib/og/link-preview";
import { SITE } from "@/lib/site";

export const alt = SITE.defaultTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return brandPreview({ name: "Physcratic", tagline: SITE.defaultTitle.replace("Physcratic | ", "") });
}
