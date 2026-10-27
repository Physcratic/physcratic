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
import { eloBands, getEloBand } from "@/lib/problem-archive";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CorpusCollection } from "./corpus-collection";

export function ProblemLibrary({
  topic,
  query,
  onOpen,
}: {
  topic?: string;
  query?: string;
  onOpen: (problem: Problem) => void;
}) {
  const [collection, setCollection] = useState("pilot");
  const [search, setSearch] = useState(query || "");
  const [selectedTopic, setSelectedTopic] = useState(topic || "all");
  const [difficulty, setDifficulty] = useState("all");
  const filtered = problems.filter(
    (problem) =>
      (selectedTopic === "all" || problem.topic === selectedTopic) &&
      (difficulty === "all" || getEloBand(problem.elo).id === difficulty) &&
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
    <Tabs
      value={collection}
      onValueChange={setCollection}
      className="flex min-w-0 flex-col gap-6"
    >
      <TabsList className="h-auto w-fit max-w-full flex-wrap">
        <TabsTrigger value="pilot">Imported pilot · 5</TabsTrigger>
        <TabsTrigger value="practice">
          Quick practice · {problems.length}
        </TabsTrigger>
      </TabsList>
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
                <SelectItem value="unrated">Unrated</SelectItem>
                {eloBands.map((band) => (
                  <SelectItem key={band.id} value={band.id}>
                    {band.range}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <TabsContent
        value="pilot"
        forceMount
        hidden={collection !== "pilot"}
        className="min-w-0"
      >
        <CorpusCollection
          query={search}
          topic={selectedTopic}
          difficulty={difficulty}
          onReset={reset}
        />
      </TabsContent>
      <TabsContent value="practice" className="flex flex-col gap-5">
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
                    Try a different concept or clear your filters to see the
                    whole collection.
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
          Quick-practice Elo difficulties are illustrative estimates for this
          preview, not calibrated ratings. Imported pilot problems remain
          unrated.
        </p>
      </TabsContent>
    </Tabs>
  );
}
