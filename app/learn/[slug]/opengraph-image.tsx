import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { findArticle } from "@/lib/learn/articles";

export const alt = "Physcratic physics olympiad guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Local asset pattern from the Next.js ImageResponse docs: read from disk with
// process.cwd() so file tracing bundles it into the deployed function.
async function markDataUrl() {
  const png = await readFile(join(process.cwd(), "public/logo-mark-transparent.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();
  const mark = await markDataUrl();
  const title = article.title;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#141416",
          color: "#f7f7f8",
        }}
      >
        <div style={{ fontSize: 36, color: "#6091ff" }}>Learn</div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.15 }}>
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={mark} width={84} height={84} alt="" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 44, fontWeight: 700, color: "#6091ff" }}>
            Physcratic
          </div>
        </div>
      </div>
    ),
    size,
  );
}
