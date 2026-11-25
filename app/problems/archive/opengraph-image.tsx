import { pagePreview } from "@/lib/og/link-preview";

export const alt = "Physcratic physics olympiad problem archive";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return pagePreview({ label: "Problems", title: "IPhO, APhO and EuPhO Problem Archive" });
}
