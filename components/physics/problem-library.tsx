"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { corpusProblems } from "@/lib/corpus-pilot";
import {
  filterProblemsByTag,
  getProblemTags,
  getTagOptions,
  tagLabel,
} from "@/lib/problem-tags";
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
import { problems, type Problem } from "@/lib/physics";
import { ProblemList } from "./problem-list";
import { eloBands, getEloBand } from "@/lib/problem-archive";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CorpusCollection } from "./corpus-collection";
import { OlympiadCatalog } from "./olympiad-catalog";
import { catalogProblems } from "@/lib/corpus-catalog";
import arena from "@/lib/arena/index.json";
import { ArenaCollection } from "./arena-collection";

export function ProblemLibrary({
  topic,
  query,
  onOpen,
}: {
  topic?: string;
  query?: string;
  onOpen: (problem: Problem) => void;
}) {
  const params = useSearchParams();
  const requestedCollection = params.get("collection");
  const [collection, setCollection] = useState(
    requestedCollection === "practice" ||
      requestedCollection === "pilot" ||
      requestedCollection === "arena"
      ? requestedCollection
      : "catalog",
  );
  const [competition, setCompetition] = useState("");
  const [pilotProblemId, setPilotProblemId] = useState<string | undefined>();
  const [search, setSearch] = useState(query || "");
  const [selectedTopic, setSelectedTopic] = useState(
    topic ? tagLabel(topic) : "all",
  );
  const [difficulty, setDifficulty] = useState("all");
  const tagOptions = getTagOptions([
    ...catalogProblems,
    ...arena.problems,
    ...corpusProblems,
    ...problems,
  ]);
  const filtered = problems.filter(
    (problem) =>
      (selectedTopic === "all" ||
        getProblemTags(problem).includes(selectedTopic)) &&
      (difficulty === "all" || getEloBand(problem.elo).id === difficulty) &&
      `${problem.title} ${getProblemTags(problem).join(" ")} ${problem.prompt}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );

  function reset() {
    setSearch("");
    setSelectedTopic("all");
    setDifficulty("all");
    setCompetition("");
  }

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <Tabs
        value={collection}
        onValueChange={setCollection}
        className="flex min-w-0 flex-col gap-6"
      >
        <div className="flex min-w-0 flex-col gap-3">
          <TabsList
            aria-label="Problem collections"
            className="h-auto w-fit max-w-full flex-wrap"
          >
            <TabsTrigger value="arena">
              Physcratic Arena ·{" "}
              {filterProblemsByTag(arena.problems, selectedTopic).length}
            </TabsTrigger>
            <TabsTrigger value="catalog">
              Olympiad archive ·{" "}
              {filterProblemsByTag(catalogProblems, selectedTopic).length}
            </TabsTrigger>
            <TabsTrigger value="pilot">
              Guided exercises ·{" "}
              {filterProblemsByTag(corpusProblems, selectedTopic).length}
            </TabsTrigger>
            <TabsTrigger value="practice">
              Quick practice ·{" "}
              {filterProblemsByTag(problems, selectedTopic).length}
            </TabsTrigger>
          </TabsList>
        </div>
        <Card className="shadow-none">
          <CardHeader className="pb-4">
            <CardTitle>
              <h2 className="text-base font-medium">Search & filters</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="sm:flex-row sm:flex-wrap sm:items-end">
              <Field className="flex-1">
                <FieldLabel htmlFor="problem-search">Find a problem</FieldLabel>
                <Input
                  id="problem-search"
                  autoFocus
                  placeholder="Search by problem or tag…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </Field>
              {collection === "catalog" && (
                <Field className="sm:w-48">
                  <FieldLabel htmlFor="competition-filter">
                    Competition
                  </FieldLabel>
                  <Input
                    id="competition-filter"
                    type="search"
                    placeholder="e.g. IPhO 2025"
                    aria-controls="catalog-results"
                    value={competition}
                    onChange={(event) => setCompetition(event.target.value)}
                  />
                </Field>
              )}
              <Field className="sm:w-48">
                <FieldLabel htmlFor="topic-filter">Tag</FieldLabel>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger id="topic-filter">
                    <SelectValue>
                      {selectedTopic === "all" ? "All tags" : selectedTopic}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All tags</SelectItem>
                      {tagOptions.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="sm:w-44">
                <FieldLabel htmlFor="difficulty-filter">
                  ELO difficulty
                </FieldLabel>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger id="difficulty-filter">
                    <SelectValue>
                      {eloBands.find((band) => band.id === difficulty)?.range ??
                        "All ratings"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All ratings</SelectItem>
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
          </CardContent>
        </Card>
        {(collection === "pilot" || collection === "practice") && (
          <p
            className={
              collection === "pilot"
                ? "rounded-lg border border-destructive p-3 text-sm leading-relaxed text-muted-foreground"
                : "text-sm leading-relaxed text-muted-foreground"
            }
            aria-live="polite"
          >
            {collection === "pilot"
                ? "Exercises from the olympiad archive, with step-by-step subpart guides. These are not additional problems."
                : "Short practice exercises with hints, worked solutions and estimated difficulty ratings."}
          </p>
        )}
        <TabsContent value="arena" className="min-w-0">
          <ArenaCollection
            query={search}
            topic={selectedTopic}
            difficulty={difficulty}
            onReset={reset}
          />
        </TabsContent>
        <TabsContent value="catalog" className="min-w-0">
          <OlympiadCatalog
            query={search}
            topic={selectedTopic}
            competition={competition}
            difficulty={difficulty}
            onReset={reset}
            onOpenImported={(id) => {
              setPilotProblemId(id);
              setCollection("pilot");
            }}
          />
        </TabsContent>
        <TabsContent
          value="pilot"
          forceMount
          hidden={collection !== "pilot"}
          className="min-w-0"
        >
          <CorpusCollection
            activeProblemId={pilotProblemId}
            onActiveProblemChange={setPilotProblemId}
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
                {filtered.length}{" "}
                {filtered.length === 1 ? "problem" : "problems"} to explore ·
                Every problem includes a hint and a worked solution.
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
            Quick-practice ELO difficulties are illustrative estimates for this
            preview, not calibrated ratings. Imported pilot problems remain
            unrated.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
