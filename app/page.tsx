import type { Metadata } from "next";
import { headers } from "next/headers";
import Dashboard from "@/components/kokonutui/dashboard";
import { HomeLanding } from "@/components/home/landing";
import { resolveHomeAudience } from "@/lib/seo/home-audience";
import { homeGraph, jsonLdScript } from "@/lib/seo/json-ld";
import { SITE, baseOpenGraph } from "@/lib/site";

// The page depends on the session cookie, so it is rendered on every request and never cached. Next sends
// "Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate" for a dynamic page, and
// tests/home-session.browser.mjs checks that a signed-in response is never served to a signed-out fetch.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: SITE.defaultTitle },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: { ...baseOpenGraph, title: SITE.defaultTitle, description: SITE.description, url: "/" },
};

export default async function Home() {
  const requestHeaders = await headers();
  const audience = await resolveHomeAudience(requestHeaders.get("cookie"), async () => {
    // Imported only when a session cookie is present, so a crawler never loads the database layer.
    const { auth } = await import("@/lib/auth");
    return auth.api.getSession({ headers: requestHeaders });
  });
  // Signed-in users get the Lobby, exactly as /dashboard shows it.
  if (audience === "member") return <Dashboard view="overview" />;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(homeGraph()) }} />
      <HomeLanding />
    </>
  );
}
