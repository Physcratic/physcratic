import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canonicalPhysicsTagId, normalizePhysicsTag, physicsMethods, physicsTagAliases,
  physicsTagLabel, physicsTagLabels, physicsTags, physicsTopics, resolvePhysicsTag,
} from "./physics-taxonomy";
import { problems } from "./physics";
import arena from "./arena/index.json";
import { filterArena, type ArenaCatalogEntry } from "./arena-schema";
import { catalogProblems, filterCatalog } from "./corpus-catalog";
import { corpusProblems, filterCorpus } from "./corpus-pilot";
import { filterProblemsByTag, getProblemTags, getTagOptions } from "./problem-tags";
import { parseDashboardParams } from "./dashboard-route";
import { authoredDocumentSchema, publicAuthoredContent, publicAuthoredMetadata } from "./problem-authoring";

test("taxonomy IDs and kind-scoped aliases are unique; every spelling resolves idempotently", () => {
  assert.equal(physicsTopics.length, 6);
  assert.equal(physicsMethods.length, 234);
  assert.equal(new Set(physicsTags.map((tag) => tag.id)).size, physicsTags.length);
  const aliases = new Map<string, string>();
  for (const tag of physicsTags) {
    assert.match(tag.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    for (const value of [tag.id, tag.label, ...tag.aliases]) {
      const normalized = normalizePhysicsTag(value);
      const key = `${tag.kind}:${normalized}`;
      assert.ok(!aliases.has(key) || aliases.get(key) === tag.id, value);
      aliases.set(key, tag.id);
      assert.equal(normalizePhysicsTag(normalized), normalized);
      assert.equal(resolvePhysicsTag(value, tag.kind), tag);
      assert.equal(canonicalPhysicsTagId(value, tag.kind), tag.id);
      assert.equal(physicsTagLabel(value), tag.label);
      assert.equal(physicsTagLabel(physicsTagLabel(value)), tag.label);
      assert.equal(canonicalPhysicsTagId(canonicalPhysicsTagId(value)!), tag.id);
      assert.equal(resolvePhysicsTag(` \t${value.toUpperCase().replaceAll(" ", "\u00a0  ")}\n`), tag);
      const matching = physicsTagAliases(value, tag.kind);
      assert.ok(matching.length < 32, value);
      for (const candidate of matching) assert.equal(resolvePhysicsTag(candidate, tag.kind), tag);
    }
  }
});

test("unknown tags and meaningful scientific distinctions survive", () => {
  for (const unknown of ["English", "Russian", "Energy", "my technique", "  Custom Case  ", "mechanic", ""]) {
    assert.equal(resolvePhysicsTag(unknown), undefined);
    assert.equal(canonicalPhysicsTagId(unknown), undefined);
    assert.equal(physicsTagLabel(unknown), unknown);
    assert.deepEqual(physicsTagAliases(unknown), [unknown]);
  }
  assert.equal(resolvePhysicsTag("Mechanics", "method"), undefined);
  assert.equal(resolvePhysicsTag("Newton's laws", "topic"), undefined);
  assert.equal(physicsTagLabel("Modern", "method"), "Modern");
  for (const [a, b] of [["Interference", "Interferometry"], ["Statistical physics", "Statistical mechanics"],
    ["Heat capacity", "Specific heat capacity"], ["Oscillations", "Small oscillations"],
    ["Energy conservation", "Energy storage"], ["Ray tracing", "Ray trajectories"]]) {
    assert.notEqual(canonicalPhysicsTagId(a), canonicalPhysicsTagId(b));
  }
  assert.equal(physicsTagLabel("pReSsUrE—VoLuMe  work"), "Pressure–volume work");
  assert.equal(physicsTagLabel("Quantum tunneling"), "Quantum tunnelling");
  assert.deepEqual(physicsTagLabels(["Modern", "modern-physics", "My tag"], "topic"), ["Modern physics", "My tag"]);
});

test("all actual collection values are inventoried and all shared filters agree", () => {
  const collections = [problems, arena.problems, corpusProblems, catalogProblems];
  assert.deepEqual(collections.map((ps) => ps.length), [12, 18, 5, 101])
  const methods = new Set<string>();
  for (const ps of collections) {
    for (const p of ps) {
      for (const value of getProblemTags(p)) {
        if (["English", "Russian"].includes(value)) continue;
        const resolved = resolvePhysicsTag(value);
        assert.ok(resolved, value);
        if (resolved.kind === "method") methods.add(resolved.id);
      }
    }
    for (const tag of physicsTags) {
      const expected = filterProblemsByTag<Parameters<typeof getProblemTags>[0]>(ps, tag.label);
      for (const alias of [tag.id, ...tag.aliases]) assert.deepEqual(filterProblemsByTag<Parameters<typeof getProblemTags>[0]>(ps, alias), expected);
    }
  }
  assert.equal(methods.size, physicsMethods.length, "no unused/invented canonical methods");
  for (const tag of physicsTags) {
    for (const value of [tag.id, tag.label, ...tag.aliases]) {
      assert.deepEqual(filterArena(arena.problems as ArenaCatalogEntry[], { topic: value }), filterProblemsByTag(arena.problems, value));
      assert.deepEqual(filterCatalog({ topic: value }), filterProblemsByTag(catalogProblems, value));
      assert.deepEqual(filterCorpus({ topic: value }), filterProblemsByTag(corpusProblems, value));
    }
  }
  assert.equal(filterProblemsByTag(problems, "Mechanics").length, 3);
  assert.equal(filterArena(arena.problems as ArenaCatalogEntry[], { topic: "Optics" }).length, 3);
  assert.equal(filterCatalog({ topic: "English" }).length, 101)
  assert.deepEqual(filterCorpus({ query: "Blackbody radiation" }), filterCorpus({ query: "Black-body radiation" }));
  assert.deepEqual(filterArena(arena.problems as ArenaCatalogEntry[], { query: "Quantum tunnelling" }), filterArena(arena.problems as ArenaCatalogEntry[], { query: "Quantum tunneling" }));
  assert.deepEqual(getTagOptions(catalogProblems).slice(0, 6), physicsTopics.map((tag) => tag.label));
  for (const topic of ["Modern", "Modern physics", "modern-physics", " MODERN  PHYSICS "]) {
    assert.equal(parseDashboardParams({ topic }).topic, "Modern");
    assert.deepEqual(filterCatalog({ topic }), filterCatalog({ topic: "Modern" }));
  }
});

test("public authored projections canonicalize without changing editable or persisted inputs", () => {
  const input = { title: "Custom draft", topicTags: ["Modern", "modern-physics", "Custom topic"],
    methodTags: ["Ideal gases", "Ideal gas", "My method"], estimatedDifficulty: null,
    context: [], sections: [], attachments: [],
    provenance: { kind: "original", source: "", rightsDeclaration: "My work" } };
  const before = structuredClone(input);
  assert.deepEqual(authoredDocumentSchema.parse(input), input);
  for (const projected of [publicAuthoredContent(input), publicAuthoredMetadata(input)]) {
    assert.deepEqual(projected.topicTags, ["Modern physics", "Custom topic"]);
    assert.deepEqual(projected.methodTags, ["Ideal gas", "My method"]);
  }
  assert.deepEqual(input, before);
});

test("taxonomy and tag helpers do not import content corpora or UI frameworks", () => {
  const taxonomy = readFileSync("lib/physics-taxonomy.ts", "utf8");
  assert.doesNotMatch(taxonomy, /^import\s/m);
  assert.doesNotMatch(readFileSync("lib/problem-tags.ts", "utf8"), /from ["']\.\/physics["']/);
});
