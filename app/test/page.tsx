import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Experimental Physcratic homepage",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// A design fixture only. Never authenticate, load a database, or expose it on a deployment.
export default async function ExperimentalHomepage() {
  if (process.env.NODE_ENV !== "development" || process.env.VERCEL === "1") notFound();
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const markup = await readFile(join(process.cwd(), "prototypes/marketplace-home/index.html"), "utf8");
  return (
    <iframe
      title="Experimental Physcratic course homepage with simulated account states"
      srcDoc={markup}
      sandbox="allow-scripts"
      style={{ display: "block", width: "100%", height: "100dvh", border: 0, background: "#f8f8f4" }}
    />
  );
}
