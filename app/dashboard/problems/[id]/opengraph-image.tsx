import { ImageResponse } from "next/og";
import { findPublicProblem } from "@/lib/seo/public-routes";

export const alt = "Physcratic physics olympiad problem";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const problem = findPublicProblem(id);
  const title = problem?.title ?? "Physics Olympiad practice";
  const topic = problem?.topic ?? "IPhO · APhO · EuPhO";
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
        <div style={{ fontSize: 36, color: "#f4b18b" }}>{topic}</div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.15 }}>
          {title}
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, color: "#f4b18b" }}>
          Physcratic
        </div>
      </div>
    ),
    size,
  );
}
