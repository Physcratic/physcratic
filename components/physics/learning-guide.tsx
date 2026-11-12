import Link from "next/link";
import { ArrowRight, BookOpen, Lightbulb, Trophy } from "lucide-react";
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
          How Physcratic works
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Practise physics problems, check your answers and read worked
          solutions. Olympiad archives and contests are included.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          {
            icon: BookOpen,
            title: "Find a problem",
            description:
              "Browse Physcratic Arena and imported olympiad problems across physics topics. Filter by subject, or search for a concept.",
            href: "/dashboard?view=problems",
            action: "Browse problems",
          },
          {
            icon: Trophy,
            title: "Enter a contest",
            description:
              "See published contests and register for upcoming rounds. Between events, work through the official IPhO archive and save your own notes and self-review marks.",
            href: "/dashboard?view=contests",
            action: "View contests",
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
          <h2 className="text-lg font-medium">Good to know</h2>
        </div>
        <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">
              Worked solutions.
            </strong>{" "}
            Arena problems include a worked solution. Guided exercises
            also provide reading notes.
          </p>
          <p>
            <strong className="font-medium text-foreground">
              Units.
            </strong>{" "}
            Enter a number in the unit requested. Follow the conditions and
            precision stated for each answer.
          </p>
          <p>
            <strong className="font-medium text-foreground">
              Accounts.
            </strong>{" "}
            Browse without an account. Sign in to save checked practice answers,
            full solution attempts and archive progress privately across
            devices. Unsubmitted edits are not saved.
          </p>
        </div>
      </section>
    </div>
  );
}
