import { pagePreview } from "@/lib/og/link-preview";

export const alt = "Physcratic physics olympiad guides";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return pagePreview({ label: "Learn", title: "Physics Olympiad Guides" });
}
