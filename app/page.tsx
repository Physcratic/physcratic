import type { Metadata } from "next";
import { HomeLanding } from "@/components/home/landing";
import { homeGraph, jsonLdScript } from "@/lib/seo/json-ld";
import { SITE, baseOpenGraph } from "@/lib/site";

// The shared public shell contains no private data. Account cards resolve independently
// on the client, so a session/database lookup never blocks the random problem or navigation.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: SITE.defaultTitle },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: { ...baseOpenGraph, title: SITE.defaultTitle, description: SITE.description, url: "/" },
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(homeGraph()) }} />
      <HomeLanding />
    </>
  );
}
