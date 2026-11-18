import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { clampOgTitle, ogSize, ogTitleFontSize } from "./text";

// The one template behind every link preview. Each opengraph-image route supplies only public strings: a topic or
// section label and a title. next.config.ts explicitly traces this public logo into metadata route functions, and
// scripts/check-opengraph-build.mjs fails the build if any other file is traced in. Do not read anything else here.
async function logoDataUrl() {
  const png = await readFile(join(process.cwd(), "public/logo-mark-transparent.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

const dark = { background: "#141416", color: "#f7f7f8", accent: "#6091ff", muted: "#f7f7f8" };
const coaching = { background: "#0c101a", color: "#f4f6fb", accent: "#f3b062", muted: "#c9d1de" };

/** A page preview: a small label on top, the title, and the Physcratic mark at the bottom. */
export async function pagePreview({ label, title }: { label: string; title: string }) {
  const mark = await logoDataUrl();
  const text = clampOgTitle(title);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: dark.background, color: dark.color }}>
        <div style={{ fontSize: 36, color: dark.accent }}>{label}</div>
        <div style={{ fontSize: ogTitleFontSize(text), fontWeight: 700, lineHeight: 1.15 }}>{text}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img elements, not next/image */}
          <img src={mark} width={84} height={84} alt="" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 44, fontWeight: 700, color: dark.accent }}>Physcratic</div>
        </div>
      </div>
    ),
    ogSize,
  );
}

/** A front door preview: the name beside the mark, then one tagline and an optional line under it. */
export async function brandPreview({ name, tagline, note, palette = "dark" }: { name: string; tagline: string; note?: string; palette?: "dark" | "coaching" }) {
  const mark = await logoDataUrl();
  const colours = palette === "coaching" ? coaching : dark;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: colours.background, color: colours.color }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img elements, not next/image */}
          <img src={mark} width={150} height={150} alt="" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: palette === "coaching" ? 88 : 96, fontWeight: 700, lineHeight: 1.05, color: palette === "coaching" ? colours.color : colours.accent }}>{name}</div>
        </div>
        <div style={{ fontSize: palette === "coaching" ? 42 : 38, marginTop: palette === "coaching" ? 40 : 24, lineHeight: 1.3, color: palette === "coaching" ? colours.muted : colours.color }}>{tagline}</div>
        {note ? <div style={{ fontSize: 40, marginTop: 36, fontWeight: 700, color: colours.accent }}>{note}</div> : null}
      </div>
    ),
    ogSize,
  );
}
