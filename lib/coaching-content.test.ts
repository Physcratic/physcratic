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
import { isShortPhrase, splitHighlight } from "./coaching/highlight";
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

test("marketing filler words are banned", () => {
  const hits = all.filter(([, s]) => /journey|unlock|elevate|seamless|empower|world-class/i.test(s)).map(([p]) => p);
  assert.deepEqual(hits, []);
});

test("coaches are never called tutors, except the verbatim student quote, the #tutors anchor and the tutor application page", () => {
  const name = content.tutorPage.title;
  const hits = all
    .filter(([p, s]) => p !== "content.reviews.quote" && !p.startsWith("content.tutorPage.") && !p.endsWith(".href") && /\btutors?\b/i.test(s.replaceAll(name, "")))
    .map(([p]) => p);
  assert.deepEqual(hits, []);
});

test("the consultation and tutor pages have the agreed copy and make no promises about pay, hours or timing", () => {
  assert.equal(content.tutorPage.title, "Tutor with Physcratic");
  assert.equal(content.tutorPage.meta.title, "Tutor with Physcratic");
  assert.ok(content.tutorPage.intro.includes("IPhO, APhO and EuPhO medallists who want to tutor with Physcratic"));
  assert.ok(/review applications and reply/.test(content.tutorPage.note));
  const promises = strings(content.tutorPage).filter(([, s]) => /\b(paid|pay|salary|income|earn|hours?|days?|weeks?|within|guarantee)\b/i.test(s));
  assert.deepEqual(promises, []);
  assert.equal(content.consultationPage.title, "Get a consultation");
  assert.ok(content.consultationPage.note.includes("within 2 business days"));
  assert.ok(content.footer.links.some((l) => l.href === "/coaching/become-a-tutor" && l.label === name()));
  assert.ok(content.footer.links.some((l) => l.href === "/coaching/consultation"));
  assert.ok(!content.footer.links.some((l) => l.href.includes("training")));
});

function name() {
  return content.tutorPage.title;
}

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
  assert.deepEqual(content.hero.facts[0], { value: `${medallists.length}`, label: "coaches" });
  assert.deepEqual(content.hero.facts[1], { value: `${new Set(medallists.map((m) => m.country)).size}`, label: "countries" });
  assert.equal(content.hero.seeAll, "See all 19 coaches");
  assert.equal(content.coaches.seeAll, content.hero.seeAll);
  const fake: Medallist[] = [
    { name: "A", slug: "a", country: "X", achievements: [] },
    { name: "B", slug: "b", country: "X", achievements: [] },
    { name: "C", slug: "c", country: "Y", achievements: [] },
  ];
  const built = buildCoachingContent(fake);
  assert.deepEqual(built.hero.facts.slice(0, 2).map((f) => `${f.value} ${f.label}`), ["3 coaches", "2 countries"]);
  assert.equal(built.coaches.seeAll, "See all 3 coaches");
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
  assert.deepEqual(content.packages.items.map((i) => `${i.sessions}, ${i.hours}`), ["16 sessions, 32 hours", "32 sessions, 64 hours"]);
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

test("hero headline and controls copy", () => {
  assert.equal(content.hero.titleMain, "Train with Physics Olympiad winners.");
  assert.equal(content.hero.titleSub, "Live online classes taught by IPhO, APhO and EuPhO medallists");
  assert.equal(content.hero.highlight, "IPhO, APhO and EuPhO medallists");
  assert.deepEqual(content.hero.facts.map((f) => `${f.value} ${f.label}`), ["19 coaches", "12 countries", "6 students max per class", "2 hours per live class"]);
  assert.equal(content.coaches.previous, "Previous coaches");
  assert.equal(content.coaches.next, "Next coaches");
  assert.equal(content.coaches.backToSlider, "Back to the slider");
});

test("each highlight is one short phrase found in its own section text", () => {
  const targets: [string, string, string | undefined][] = [
    ["hero", content.hero.titleSub, content.hero.highlight],
    ["coaches", content.coaches.text, content.coaches.highlight],
    ["programs", content.programs.intro, content.programs.highlight],
    ["classFormat", content.classFormat.stretchText, content.classFormat.highlight],
    ["scheduling", content.scheduling.text, content.scheduling.highlight],
    ["path", content.path.steps[1].body, content.path.highlight],
    ["packages", content.packages.pricingText, content.packages.highlight],
  ];
  for (const [section, text, phrase] of targets) {
    assert.ok(phrase && isShortPhrase(phrase), `${section} highlight is short`);
    assert.ok(splitHighlight(text, phrase), `${section} highlight is in its text`);
  }
  const sections = Object.entries(content).filter(([, v]) => v && typeof v === "object" && "highlight" in v).map(([k]) => k);
  assert.deepEqual(sections.sort(), targets.map(([k]) => k).sort());
});

test("the review drops Kak and links the first Arrow", () => {
  const { quote, linkText } = content.reviews;
  assert.ok(!quote.includes("Kak"));
  assert.ok(quote.includes("if I hadn't met Arrow."));
  assert.ok(quote.includes("Thank you so much, Arrow, for being my tutor!"));
  assert.equal(linkText, "Arrow");
  assert.equal(quote.indexOf(linkText), quote.indexOf("Arrow."));
  assert.equal(content.reviews.medal, "Best Theory and Gold medal");
});

test("in-page nav links are plain fragments so the browser scrolls smoothly", () => {
  for (const link of content.nav) assert.ok(link.href.startsWith("#") || link.href === "/dashboard" || link.href === "/learn", link.href);
});

test("the Phase 2d copy: programs intro, class tiles, guides labels and the new links", () => {
  assert.equal(content.programs.intro, "Three levels take you from your first olympiad to IPhO.");
  assert.equal(content.programs.highlight, "from your first olympiad to IPhO");
  assert.ok(splitHighlight(content.programs.intro, content.programs.highlight));
  assert.deepEqual(content.classFormat.tiles.map((t) => `${t.value} ${t.label}`), ["6 students at most", "2 h a week, live online", "Every class recorded", "Notes homework and worked solutions"]);
  assert.deepEqual(content.classFormat.points, [
    "Up to 6 students at your level, with similar goals",
    "2 hours a week, live online, with a coach matched to your level and language",
    "Olympiad problem-solving, not school physics",
    "Recordings, notes, homework and worked solutions for every class",
    "A WhatsApp group with your coach for questions between classes",
    "Personal feedback after every 4 sessions",
  ]);
  assert.ok(content.classFormat.sources.includes("China") && content.classFormat.sources.includes("IPhO") && content.classFormat.sources.length === 9);
  assert.equal(content.classFormat.topics.length, 10);
  assert.deepEqual([content.guides.title, content.guides.seeAll, content.guides.minutes], ["Free guides", "See all guides", "min read"]);
  assert.ok(content.nav.some((l) => l.href === "/learn" && l.label === "Guides"));
  assert.ok(content.footer.links.some((l) => l.href === "/learn" && l.label === "Free guides"));
});

test("every program has topic chips, and the IB track is the only non-olympiad one", () => {
  for (const item of content.programs.items) assert.ok(Array.isArray(item.covers) && item.covers.length >= 3, item.title);
  assert.deepEqual(content.programs.items.filter((i) => !i.pathway.startsWith("Olympiad")).map((i) => i.pathway), ["IB or A-Level"]);
});

test("packages show sessions and hours, with no price and no popular or recommended label", () => {
  const text = JSON.stringify(content.packages);
  assert.ok(!/[$€£]|\bpopular\b|\brecommended\b|\bbest value\b/i.test(text));
});
