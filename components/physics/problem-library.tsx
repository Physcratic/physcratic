"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { parseProblemCollection, problemCollectionHref } from "@/lib/problem-collection-route";
import { corpusProblems } from "@/lib/corpus-pilot";
import {
  filterProblemsByTag,
  getTagOptions,
  tagLabel,
} from "@/lib/problem-tags";
import { Input } from "@/components/ui/input";
import { physicsTopicLabels } from "@/lib/physics-taxonomy";
import { solveTokens } from "./solve-ui";
import { TopicChips } from "./topic-chips";
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
import { type Problem } from "@/lib/physics";
import { ratingBands } from "@/lib/rating-bands";
import { RatingBandsPopover } from "./rating-bands-popover";
import { TagFilterContext, tagFilterHref } from "./tag-filter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CorpusCollection } from "./corpus-collection";
import { OlympiadCatalog } from "./olympiad-catalog";
import { catalogProblems } from "@/lib/corpus-catalog";
import arena from "@/lib/arena/index.json";
import { UnifiedArenaCollection } from "./unified-arena-collection";

export function ProblemLibrary({
  topic,
  query,
  onReadingChange,
}: {
  topic?: string;
  query?: string;
  onOpen: (problem: Problem) => void;
  /** Tells the page when a guided problem is open, so its title can be the page heading. */
  onReadingChange?: (reading: boolean) => void;
}) {
  const params = useSearchParams();
  const requestedCollection = params.get("collection");
  const [collection, setCollection] = useState(() => parseProblemCollection(requestedCollection));
  useEffect(() => {
    setCollection(parseProblemCollection(requestedCollection));
  }, [requestedCollection]);

  function changeCollection(value: string) {
    setCollection(parseProblemCollection(value));
    window.history.replaceState(null, "", problemCollectionHref(window.location.href, value));
  }
  const [competition, setCompetition] = useState("");
  const [pilotProblemId, setPilotProblemId] = useState<string | undefined>();
  const [search, setSearch] = useState(query || "");
  // The tag filter lives in the address (?tag= or the sidebar's ?topic=), so it can be shared and survives a reload.
  const urlTag = params.get("tag");
  const urlTopic = params.get("topic");
  const fromAddress = () => {
    const value = (urlTag ?? urlTopic ?? topic ?? "").trim().slice(0, 80);
    return value ? tagLabel(value) : "all";
  };
  const [selectedTopic, setSelectedTopic] = useState(fromAddress);
  useEffect(() => {
    setSelectedTopic(fromAddress());
    // fromAddress reads the same two values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTag, urlTopic]);
  function commitTag(value: string) {
    window.history.replaceState(null, "", tagFilterHref(window.location.href, value));
  }
  function chooseTag(next: string) {
    const value = next.trim().slice(0, 80) || "all";
    setSelectedTopic(value);
    commitTag(value);
  }
  const [difficulty, setDifficulty] = useState("all");
  // While a guided problem is open, the collection tabs and filters are not shown, only the problem.
  const reading = collection === "pilot" && Boolean(pilotProblemId);
  useEffect(() => {
    onReadingChange?.(reading);
    return () => onReadingChange?.(false);
  }, [reading, onReadingChange]);
  const difficultyForCollection = (collection === "arena" || collection === "authored" || difficulty !== "unrated") ? difficulty : "all";
  const tagOptions = getTagOptions([
    ...catalogProblems,
    ...arena.problems,
    ...corpusProblems,
  ]);

  function reset() {
    setSearch("");
    chooseTag("all");
    setDifficulty("all");
    setCompetition("");
  }

  return (
    <TagFilterContext.Provider value={{ active: selectedTopic, toggle: chooseTag }}>
    <div className={`flex min-w-0 flex-col gap-7 ${solveTokens}`}>
      <Tabs
        value={collection}
        onValueChange={changeCollection}
        className="flex min-w-0 flex-col gap-6"
      >
        {!reading && <>
        <div className="flex min-w-0 flex-col gap-3">
          <TabsList
            aria-label="Problem collections"
            className="h-auto w-fit max-w-full flex-wrap"
          >
            <TabsTrigger className="min-h-11" value={collection === "authored" ? "authored" : "arena"}>
              Physcratic Arena
            </TabsTrigger>
            <TabsTrigger className="min-h-11" value="catalog">
              Olympiad archive ·{" "}
              {filterProblemsByTag(catalogProblems, selectedTopic).length}
            </TabsTrigger>
            <TabsTrigger className="min-h-11" value="pilot">
              Guided exercises ·{" "}
              {filterProblemsByTag(corpusProblems, selectedTopic).length}
            </TabsTrigger>
          </TabsList>
        </div>
        <Card className="shadow-none">
          <CardHeader className="pb-4">
            <CardTitle>
              <h2 className="text-lg font-medium">Search & filters</h2>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Pick a topic or type a search, then open a problem.</p>
          </CardHeader>
          <CardContent className="flex min-w-0 flex-col gap-5">
            <TopicChips topics={physicsTopicLabels} value={selectedTopic} onChange={chooseTag} />
            <FieldGroup className="sm:flex-row sm:flex-wrap sm:items-end">
              <Field className="flex-1">
                <FieldLabel htmlFor="problem-search">Find a problem</FieldLabel>
                <Input
                  id="problem-search"
                  className="h-11"
                  maxLength={200}
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
                    className="h-11"
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
                <Input id="topic-filter" className="h-11" list="problem-tag-options" maxLength={80} value={selectedTopic === "all" ? "" : selectedTopic} placeholder="All tags" onChange={e => setSelectedTopic(e.target.value || "all")} onBlur={() => commitTag(selectedTopic)} />
                <datalist id="problem-tag-options">{tagOptions.map(tag => <option key={tag} value={tag} />)}</datalist>
              </Field>
              <Field className="sm:w-60">
                <FieldLabel htmlFor="difficulty-filter">
                  Rating band
                </FieldLabel>
                <Select value={difficultyForCollection} onValueChange={setDifficulty}>
                  <SelectTrigger id="difficulty-filter" className="h-11">
                    <SelectValue>
                      {difficultyForCollection === "unrated" ? "Unrated / author labels" : ratingBands.find((band) => band.id === difficultyForCollection)?.name ?? (difficultyForCollection === "all" ? "All ratings" : "Rating band")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All ratings</SelectItem>
                      {(collection === "arena" || collection === "authored") && <SelectItem value="unrated">Unrated / author labels</SelectItem>}
                      {ratingBands.map((band) => (
                        <SelectItem key={band.id} value={band.id}>
                          {band.name}, {band.range}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            {selectedTopic !== "all" && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p role="status" className="text-base">Showing problems tagged <strong>{selectedTopic}</strong>.</p>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => chooseTag("all")}>
                  Clear tag filter
                </Button>
              </div>
            )}
            <div className="mt-2">
              <RatingBandsPopover />
            </div>
          </CardContent>
        </Card>
        </>}
        <TabsContent value="authored" className="min-w-0">
          <UnifiedArenaCollection query={search} topic={selectedTopic} difficulty={difficultyForCollection} source="authored" onReset={reset} />
        </TabsContent>
        <TabsContent value="arena" className="min-w-0">
          <UnifiedArenaCollection
            query={search}
            topic={selectedTopic}
            difficulty={difficultyForCollection}
            onReset={reset}
          />
        </TabsContent>
        <TabsContent value="catalog" className="min-w-0">
          <OlympiadCatalog
            query={search}
            topic={selectedTopic}
            competition={competition}
            difficulty={difficultyForCollection}
            onReset={reset}
            onOpenImported={(id) => {
              setPilotProblemId(id);
              changeCollection("pilot");
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
            titleAs={reading ? "h1" : "h2"}
            activeProblemId={pilotProblemId}
            onActiveProblemChange={setPilotProblemId}
            query={search}
            topic={selectedTopic}
            difficulty={difficultyForCollection}
            onReset={reset}
          />
        </TabsContent>
      </Tabs>
    </div>
    </TagFilterContext.Provider>
  );
}
