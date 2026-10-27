"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { topics, problems, type Problem } from "@/lib/physics";
import { ProblemList } from "./problem-list";
import { MathFormula } from "./math-formula";
import { RatingCard } from "./rating-card";

export function Overview({ onOpen }: { onOpen: (problem: Problem) => void }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid min-w-0 grid-cols-1 gap-5 min-[1100px]:grid-cols-[1.65fr_1fr]">
        <section
          className="flex overflow-hidden rounded-xl border bg-hero text-hero-foreground"
          aria-label="Welcome to Newton"
        >
          <div className="relative flex flex-1 flex-col items-start gap-5 p-6 sm:p-8 lg:py-9">
            <span className="flex items-center gap-2 text-sm text-primary">
              <span className="size-1.5 rounded-full bg-primary" />A little
              curiosity goes a long way
            </span>
            <h2 className="text-balance text-3xl font-medium leading-[1.2] tracking-[-0.04em] sm:text-[32px]">
              Small steps.
              <br />
              Big breakthroughs.
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-hero-foreground/60">
              Make sense of the world around you.
              <br className="hidden sm:block" /> Build your physics intuition,
              one problem at a time.
            </p>
            <Button onClick={() => onOpen(problems[0])}>
              Let&apos;s solve something
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="hidden w-[30%] shrink-0 items-center justify-center sm:flex">
            <Image
              src="/newton-cradle.png"
              width={768}
              height={512}
              priority
              alt="Newton’s cradle with a raised peach-colored ball, illustrating motion and energy transfer"
              className="hero-image h-full max-h-80 w-full object-cover object-right"
            />
          </div>
        </section>
        <RatingCard />
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="topics-heading">
        <div className="flex items-center justify-between">
          <h2
            id="topics-heading"
            className="text-base font-medium tracking-tight"
          >
            Follow your curiosity
          </h2>
          <Link
            href="/dashboard?view=problems"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            All topics
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {topics.map(({ name, description, icon: Icon, count }) => (
            <Link
              key={name}
              href={`/dashboard?view=problems&topic=${encodeURIComponent(name)}`}
              className="group flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <span className="flex items-center justify-between">
                <Icon className="size-5 text-primary" strokeWidth={1.5} />
                <ArrowUpRight className="size-4 text-muted-foreground/60 transition-colors group-hover:text-primary" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-sm font-medium">{name}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <span className="text-sm text-muted-foreground">
                {count} problems
                <span className="px-1.5 text-muted-foreground/50">·</span>
                Explore
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 min-[1100px]:grid-cols-[1.65fr_1fr]">
        <Card className="flex min-w-0 flex-col overflow-hidden shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2.5">
                <BookOpen
                  className="size-[18px] text-muted-foreground"
                  strokeWidth={1.6}
                />
                <h2 className="text-base font-medium tracking-tight">
                  A good place to start
                </h2>
              </CardTitle>
              <span className="hidden text-sm text-muted-foreground sm:block">
                Picked for you
              </span>
            </div>
            <CardDescription>
              Build confidence with the fundamentals.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 px-0 pb-0">
            <ProblemList items={problems.slice(0, 3)} onOpen={onOpen} />
          </CardContent>
          <CardFooter className="justify-center border-t pb-4 pt-4">
            <Link
              href="/dashboard?view=problems"
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Explore the problem library
              <ArrowRight className="size-4" />
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Sparkles
                className="size-[18px] text-primary"
                strokeWidth={1.6}
              />
              <h2 className="text-base font-medium tracking-tight">
                Up for a challenge?
              </h2>
            </CardTitle>
            <CardDescription>A little stretch for your brain.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Mechanics</Badge>
              <span className="text-sm text-muted-foreground">8 min</span>
            </div>
            <h3 className="text-lg font-medium tracking-tight">
              The projectile challenge
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A ball leaves the ground at an angle. Where does it land? Put your
              understanding of motion to the test.
            </p>
            <div className="rounded-lg bg-muted/70 px-3 py-1 text-muted-foreground">
              <MathFormula formula={"$$R=\\frac{v_0^2\\sin(2\\theta)}{g}$$"} />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpen(problems[3])}
            >
              Give it a try
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      <section className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 text-card-foreground sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Lightbulb className="size-5" strokeWidth={1.5} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">
              A little pressure. A new perspective.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Try a timed round, find your rhythm, and learn from every attempt.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard?view=contests">
            Explore contests
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        </Button>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 pb-1 text-sm text-muted-foreground">
        <span>Made for curious minds.</span>
        <span className="flex items-center gap-1.5">
          <Check className="size-3.5" />
          Take your time. Make it click.
        </span>
      </footer>
    </div>
  );
}
