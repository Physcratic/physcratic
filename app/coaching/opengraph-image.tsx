import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { content } from "@/lib/coaching/content";

export const alt = content.og.tagline;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same local-asset pattern as app/opengraph-image.tsx: the mark is read from disk with process.cwd()
// so file tracing bundles it, and nothing is fetched over the network. The font is the one next/og ships.
async function markDataUrl() {
  const png = await readFile(join(process.cwd(), "public/logo-mark-transparent.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

export default async function Image() {
  const mark = await markDataUrl();
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
          background: "#0c101a",
          color: "#f4f6fb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <img src={mark} width={150} height={150} alt="" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>{content.ui.brand}</div>
        </div>
        <div style={{ fontSize: 42, marginTop: 40, lineHeight: 1.3, color: "#c9d1de" }}>{content.og.tagline}</div>
        <div style={{ fontSize: 40, marginTop: 36, fontWeight: 700, color: "#f3b062" }}>{content.og.stats}</div>
      </div>
    ),
    size,
  );
}
