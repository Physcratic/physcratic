import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { BrandMark } from "./brand-mark";
import { links } from "./data";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/60">
      {/* Grid paper, echoing the logo. Pure CSS, fades out downwards. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.55)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.55)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_95%)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_200px] md:gap-12 lg:grid-cols-[minmax(0,1fr)_280px] md:py-20">
        <BrandMark
          size={280}
          className="mx-auto size-40 md:order-2 md:size-[200px] lg:size-[280px]"
        />
        <div className="md:order-1">
          <Badge variant="outline" className="mb-4 border-primary/60 text-accent-foreground">
            Beta
          </Badge>
          <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            {SITE.tagline}
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
            Real problems from IPhO, APhO and EuPhO with their original diagrams.
            Save your attempts privately and see your progress.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a href={links.problems}>Start practising</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={links.firstWarmUp}>Try a warm-up problem</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
