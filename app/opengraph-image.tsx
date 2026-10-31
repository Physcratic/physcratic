import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = SITE.defaultTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Local asset pattern from the Next.js ImageResponse docs: read from disk with
// process.cwd() so file tracing bundles it into the deployed function.
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
          background: "#141416",
          color: "#f7f7f8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark} width={150} height={150} alt="" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 96, fontWeight: 700, color: "#6091ff" }}>
            Physcratic
          </div>
        </div>
        <div style={{ fontSize: 44, marginTop: 24, lineHeight: 1.3 }}>
          {SITE.tagline}
        </div>
      </div>
    ),
    size,
  );
}
