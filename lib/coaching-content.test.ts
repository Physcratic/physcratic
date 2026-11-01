import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildCoachingContent,
  coachAnchorId,
  coachCount,
  coachImageAlt,
  content,
  countryCount,
  definition,
  programHref,
} from "./coaching/content";
import { coachingPathways, isCoachingPathway } from "./coaching/consultation";
import { countryFlagCodes, medallists, medalLabel, type Medallist } from "./coaching/medallists";

function strings(value: unknown, path = "content"): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, i) => strings(item, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`));
  return [];
}

const all: [string, string][] = [
  ...strings(content),
  ...strings(definition, "definition"),
  ...strings(medalLabel, "medalLabel"),
  ...strings(coachingPathways, "coachingPathways"),
  ...strings(medallists.map((m) => [coachAnchorId(m.slug), coachImageAlt(m.name, m.country)]), "coach helpers"),
  ...coachingPathways.map((p): [string, string] => [`programHref(${p})`, programHref(p)]),
];

test("the walker finds the copy", () => {
  assert.ok(all.length > 100);
});

test("no em dash, en dash or semicolon in any user-visible string", () => {
  const bad = all.filter(([, s]) => /[—–;]/.test(s)).map(([p, s]) => `${p}: ${s}`);
  assert.deepEqual(bad, []);
});

test("old copy and wrong spellings are banned", () => {
  const banned = ["One-to-one", "one-to-one tutoring", "Tutor inquiry", "IGCSE", "within two days", "General physics consultation", "medalists", "Honorable"];
  const hits = all.flatMap(([p, s]) => banned.filter((b) => s.includes(b)).map((b) => `${p} contains "${b}"`));
  assert.deepEqual(hits, []);
});

test("coaches are never called tutors, except the verbatim student quote and the #tutors anchor", () => {
  const hits = all.filter(([p, s]) => p !== "content.reviews.quote" && !p.endsWith(".href") && /\btutors?\b/i.test(s)).map(([p]) => p);
  assert.deepEqual(hits, []);
});

test("British spelling", () => {
  const hits = all.filter(([, s]) => /\bpractice (a|the|your|more)\b|\bhonorable\b|\bmedalist/i.test(s)).map(([p]) => p);
  assert.deepEqual(hits, []);
});

test("time ranges use 'to'", () => {
  assert.equal(content.scheduling.caption, "Class time: Wednesday, 15:00 to 17:00 GMT.");
  assert.deepEqual(content.scheduling.ranges.students, ["13:00 to 17:00", "15:00 to 18:00", "15:00 to 17:00"]);
  assert.equal(content.scheduling.ranges.overlap, "15:00 to 17:00");
});

test("the definition sentence is exact and reused", () => {
  assert.equal(definition, "Physcratic Coaching is an online Physics Olympiad coaching program where students train in live classes of up to 6 with IPhO, APhO and EuPhO medallists.");
  assert.equal(content.footer.tagline, definition);
  assert.ok(content.faq.items[0].answer.startsWith(`${definition} It is run by Physcratic`));
});

test("counts are computed from the medallists", () => {
  assert.equal(coachCount, medallists.length);
  assert.equal(countryCount, new Set(medallists.map((m) => m.country)).size);
  assert.equal(coachCount, 19);
  assert.equal(countryCount, 12);
  assert.equal(content.hero.facts[0], `${medallists.length} coaches`);
  assert.equal(content.hero.facts[1], `${new Set(medallists.map((m) => m.country)).size} countries`);
  const fake: Medallist[] = [
    { name: "A", slug: "a", country: "X", achievements: [] },
    { name: "B", slug: "b", country: "X", achievements: [] },
    { name: "C", slug: "c", country: "Y", achievements: [] },
  ];
  const built = buildCoachingContent(fake);
  assert.deepEqual(built.hero.facts.slice(0, 2), ["3 coaches", "2 countries"]);
  assert.ok(built.coaches.text.includes("3 coaches from 2 countries"));
  assert.ok(built.glance.items.find((i) => i.term === "Coaches")?.detail.includes("3 IPhO, APhO and EuPhO medallists and honourable mentions from 2 countries"));
  assert.ok(built.faq.items[1].answer.includes("There are 3 coaches from 2 countries."));
  assert.equal(built.coaches.coachCount, 3);
  assert.equal(built.coaches.countryCount, 2);
});

test("no typed coach or country counts in the content source", () => {
  const source = readFileSync(new URL("./coaching/content.ts", import.meta.url), "utf8");
  assert.deepEqual(source.match(/\b\d+ (coaches|countries)\b/g), null);
});

test("programs map to real pathways and the review link targets a real coach", () => {
  for (const item of content.programs.items) assert.ok(isCoachingPathway(item.pathway), item.pathway);
  assert.equal(content.programs.items.length, 4);
  assert.ok(medallists.some((m) => m.slug === content.reviews.linkSlug));
  assert.ok(content.reviews.quote.includes(content.reviews.linkText));
  assert.equal(coachAnchorId(content.reviews.linkSlug), "coach-arrow-kristian");
  assert.equal(programHref("IB or A-Level"), "/coaching?goal=IB%20or%20A-Level#hero-cta");
});

test("every pathway has a helper line", () => {
  for (const p of coachingPathways) assert.ok(content.hero.pathwayHelp[p], p);
});

test("package hours are sessions times class hours", () => {
  assert.deepEqual(content.packages.items.map((i) => i.size), ["16 sessions, 32 hours", "32 sessions, 64 hours"]);
});

test("every country has a flag file and every photo-less coach has no image on disk", () => {
  const root = new URL("../public/coaching/", import.meta.url);
  for (const m of medallists) {
    const code = countryFlagCodes[m.country];
    assert.ok(code && existsSync(new URL(`flags/${code}.png`, root)), `${m.country} flag`);
    const portrait = (ext: string, suffix = "") => existsSync(new URL(`medallists/${m.slug}${suffix}.${ext}`, root));
    if (m.photo === false) assert.ok(!portrait("webp") && !portrait("png") && !portrait("webp", "-cutout"), `${m.slug} should have no image`);
    else assert.ok(portrait(m.photo ?? "webp"), `${m.slug} portrait`);
  }
  assert.deepEqual(medallists.filter((m) => m.photo === false).map((m) => m.slug), ["nima", "yota", "ignat-riazanov"]);
});
