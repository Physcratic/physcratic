"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formulas, topics } from "@/lib/physics";
import { MathFormula } from "./math-formula";

export function FormulaSheet() {
  const [topic, setTopic] = useState("all");
  const items = formulas.filter(
    (formula) => topic === "all" || formula.topic === topic,
  );
  return (
    <div className="flex flex-col gap-6">
      <Field className="w-full sm:w-56">
        <FieldLabel htmlFor="formula-topic">Explore a topic</FieldLabel>
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger id="formula-topic">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map((item) => (
                <SelectItem key={item.name} value={item.name}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {items.map((formula) => (
          <Card key={formula.title} className="flex flex-col shadow-none">
            <CardHeader className="gap-3">
              <Badge variant="secondary" className="w-fit">
                {formula.topic}
              </Badge>
              <CardTitle>
                <h2 className="text-lg font-medium">{formula.title}</h2>
              </CardTitle>
              <CardDescription className="leading-relaxed">
                {formula.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="rounded-lg bg-muted p-3 text-foreground">
                <MathFormula formula={formula.equation} />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {formula.symbols}
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href={`/dashboard?view=problems&topic=${encodeURIComponent(formula.topic)}`}
                >
                  Put it into practice
                  <ArrowUpRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Use SI units unless a problem says otherwise. Always check the
        assumptions before choosing an equation.
      </p>
    </div>
  );
}
