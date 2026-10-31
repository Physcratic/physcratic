import type { Metadata } from "next";
import { ArchiveTeaser } from "@/components/landing/archive-teaser";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ProofStrip } from "@/components/landing/proof-strip";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { TopicGrid } from "@/components/landing/topic-grid";
import { WarmUps } from "@/components/landing/warm-ups";
import { jsonLdScript, organization, website } from "@/lib/seo/json-ld";
import { SITE, baseOpenGraph } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE.defaultTitle },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    ...baseOpenGraph,
    title: SITE.defaultTitle,
    description: SITE.description,
    url: "/",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([organization(), website()]),
        }}
      />
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content">
        <Hero />
        <ProofStrip />
        <TopicGrid />
        <WarmUps />
        <HowItWorks />
        <ArchiveTeaser />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
