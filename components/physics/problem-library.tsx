"use client";

import { useState } from "react";
import { BookOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { problems, topics, type Problem } from "@/lib/physics";
import { ProblemList } from "./problem-list";

export function ProblemLibrary({
  topic,
  query,
  onOpen,
}: {
  topic?: string;
  query?: string;
  onOpen: (problem: Problem) => void;
}) {
  const [search, setSearch] = useState(query || "");
  const [selectedTopic, setSelectedTopic] = useState(topic || "all");
  const [difficulty, setDifficulty] = useState("all");
  const filtered = problems.filter(
    (problem) =>
      (selectedTopic === "all" || problem.topic === selectedTopic) &&
      (difficulty === "all" ||
        (difficulty === "under-1200" && problem.elo < 1200) ||
        (difficulty === "1200-1599" && problem.elo >= 1200 && problem.elo < 1600) ||
        (difficulty === "1600-plus" && problem.elo >= 1600)) &&
      `${problem.title} ${problem.topic} ${problem.concept} ${problem.prompt}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );

  function reset() {
    setSearch("");
    setSelectedTopic("all");
    setDifficulty("all");
  }

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup className="sm:flex-row sm:items-end">
        <Field className="flex-1">
          <FieldLabel htmlFor="problem-search">Find a problem</FieldLabel>
          <Input
            id="problem-search"
            autoFocus
            placeholder="Search by problem, topic, or concept…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <Field className="sm:w-48">
          <FieldLabel htmlFor="topic-filter">Topic</FieldLabel>
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger id="topic-filter">
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
        <Field className="sm:w-44">
          <FieldLabel htmlFor="difficulty-filter">Elo difficulty</FieldLabel>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger id="difficulty-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All ratings</SelectItem>
                <SelectItem value="under-1200">Below 1,200</SelectItem>
                <SelectItem value="1200-1599">1,200–1,599</SelectItem>
                <SelectItem value="1600-plus">1,600+</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <Card className="overflow-hidden shadow-none">
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-medium">
              {selectedTopic === "all"
                ? "The problem collection"
                : selectedTopic}
            </h2>
          </CardTitle>
          <CardDescription aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "problem" : "problems"}{" "}
            to explore · Every problem includes a hint and a worked solution.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {filtered.length ? (
            <ProblemList items={filtered} onOpen={onOpen} />
          ) : (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpen />
                </EmptyMedia>
                <EmptyTitle>No problems found</EmptyTitle>
                <EmptyDescription>
                  Try a different concept or clear your filters to see the whole
                  collection.
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={reset}>
                <RotateCcw data-icon="inline-start" />
                Clear filters
              </Button>
            </Empty>
          )}
        </CardContent>
      </Card>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Elo difficulties are illustrative estimates for this preview, not calibrated ratings.
      </p>
    </div>
  );
}
