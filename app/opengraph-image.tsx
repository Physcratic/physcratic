import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = SITE.defaultTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#141416",
          color: "#f7f7f8",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, color: "#f4b18b" }}>
          Physcratic
        </div>
        <div style={{ fontSize: 44, marginTop: 24, lineHeight: 1.3 }}>
          {SITE.defaultTitle.replace("Physcratic — ", "")}
        </div>
      </div>
    ),
    size,
  );
}
