import Link from "next/link";
import { ArrowRight, BookOpen, Lightbulb, SquareFunction } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LearningGuide() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="rounded-xl border bg-card p-6 text-card-foreground sm:p-8">
        <h2 className="text-balance text-2xl font-medium tracking-tight">
          You don&apos;t have to be a physicist to think like one.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Newton is a quiet space to understand how the world works. Start with
          a question, reason through the possibilities, and let each small
          discovery lead to the next.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          {
            icon: BookOpen,
            title: "Find your starting point",
            description:
              "Browse 12 problems across mechanics, electricity, waves, and thermodynamics. Filter by difficulty, or search for a concept you want to explore.",
            href: "/dashboard?view=problems",
            action: "Explore the library",
          },
          {
            icon: SquareFunction,
            title: "See the bigger picture",
            description:
              "Our formula sheet connects essential equations with their meaning, units, and assumptions. Use it as a reference, not a replacement for your intuition.",
            href: "/dashboard?view=formulas",
            action: "Open the formula sheet",
          },
        ].map(({ icon: Icon, title, description, href, action }) => (
          <Card key={title} className="flex flex-col shadow-none">
            <CardHeader className="gap-4">
              <Icon className="size-6 text-primary" strokeWidth={1.5} />
              <CardTitle>
                <h3 className="text-lg font-medium">{title}</h3>
              </CardTitle>
              <CardDescription className="leading-relaxed">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter>
              <Button variant="outline" asChild>
                <Link href={href}>
                  {action}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <section className="flex flex-col gap-5 rounded-xl border p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Lightbulb className="size-5 text-primary" />
          <h2 className="text-lg font-medium">A few things worth knowing</h2>
        </div>
        <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">
              A hint isn&apos;t a shortcut.
            </strong>{" "}
            It&apos;s another way to see the problem. Each practice problem
            includes a hint and a complete worked solution.
          </p>
          <p>
            <strong className="font-medium text-foreground">
              Think in units.
            </strong>{" "}
            Enter a number in the unit requested. Numerical answers within 0.5%
            of the expected value are accepted.
          </p>
          <p>
            <strong className="font-medium text-foreground">
              This is an open practice workspace.
            </strong>{" "}
            No account is required. Answers and feedback stay in the current
            practice view and are not saved when you close it or refresh the
            page.
          </p>
        </div>
      </section>
    </div>
  );
}
