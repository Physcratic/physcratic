"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { corpusProblems } from "@/lib/corpus-pilot";
import {
  filterProblemsByTag,
  getTagOptions,
  tagLabel,
} from "@/lib/problem-tags";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { eloBands } from "@/lib/problem-archive";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CorpusCollection } from "./corpus-collection";
import { OlympiadCatalog } from "./olympiad-catalog";
import { catalogProblems } from "@/lib/corpus-catalog";
import arena from "@/lib/arena/index.json";
import { ArenaCollection } from "./arena-collection";

export function ProblemLibrary({
  topic,
  query,
}: {
  topic?: string;
  query?: string;
}) {
  const params = useSearchParams();
  const requestedCollection = params.get("collection");
  const [collection, setCollection] = useState(
    requestedCollection === "pilot" || requestedCollection === "arena"
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
  ]);

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
      </Tabs>
    </div>
  );
}
