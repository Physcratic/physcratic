import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SITE } from "./site";
import { dashboardMetadata, parseDashboardParams } from "./dashboard-route";

const meta = (p: Record<string, string | undefined>) =>
  dashboardMetadata(parseDashboardParams(p), p) as {
    title: unknown; description: string; alternates: { canonical: string };
    openGraph: { url: string; title: string; description: string; siteName: string };
    robots?: { index: boolean; follow: boolean };
  };

describe("parseDashboardParams", () => {
  it("defaults to overview and rejects unknown views", () => {
    assert.equal(parseDashboardParams({}).view, "overview");
    assert.equal(parseDashboardParams({ view: "x" }).view, "overview");
    assert.equal(parseDashboardParams({ view: ["guide"] }).view, "overview");
  });
  it("aliases Electricity, drops unknown topics, caps q", () => {
    assert.equal(
      parseDashboardParams({ topic: "Electricity" }).topic,
      "Electromagnetism",
    );
    assert.equal(parseDashboardParams({ topic: "Nope" }).topic, undefined);
    assert.equal(parseDashboardParams({ q: "a".repeat(300) }).query?.length, 200);
  });
});

describe("dashboardMetadata", () => {
  it("overview", () => {
    const m = meta({});
    assert.deepEqual(m.title, { absolute: SITE.defaultTitle });
    assert.equal(m.description, SITE.description);
    assert.equal(m.alternates.canonical, "/dashboard");
    assert.equal(m.openGraph.url, "/dashboard");
    assert.equal(m.openGraph.title, SITE.defaultTitle);
    assert.equal(m.robots, undefined);
  });
  for (const [view, title] of [
    ["problems", "Physics Olympiad problems"],
    ["contests", "Physics contests"],
    ["rankings", "Rankings"],
    ["guide", "Learning guide"],
  ]) {
    it(view, () => {
      const m = meta({ view });
      assert.equal(m.title, title);
      assert.equal(m.alternates.canonical, `/dashboard?view=${view}`);
      assert.equal(m.openGraph.title, title);
      assert.equal(m.openGraph.description, m.description);
      assert.equal(m.openGraph.siteName, "Physcratic");
    });
  }
  it("topic", () => {
    const m = meta({ view: "problems", topic: "Mechanics" });
    assert.equal(m.title, "Mechanics physics problems");
    assert.match(m.description, /^Olympiad-level Mechanics problems/);
    assert.equal(m.alternates.canonical, "/dashboard?view=problems&topic=Mechanics");
    assert.equal(m.robots, undefined);
  });
  it("unknown topic falls back to the problems view", () => {
    const m = meta({ view: "problems", topic: "Nope" });
    assert.equal(m.title, "Physics Olympiad problems");
    assert.equal(m.alternates.canonical, "/dashboard?view=problems");
  });
  it("q and search=1 are noindex,follow with a clean canonical", () => {
    const q = meta({ view: "problems", q: "x" });
    assert.deepEqual(q.robots, { index: false, follow: true });
    assert.equal(q.alternates.canonical, "/dashboard?view=problems");
    const s = meta({ view: "problems", topic: "Waves", search: "1" });
    assert.deepEqual(s.robots, { index: false, follow: true });
    assert.equal(s.alternates.canonical, "/dashboard?view=problems&topic=Waves");
  });
  it("topic is dropped from the canonical outside the problems view", () => {
    assert.equal(meta({ view: "guide", topic: "Waves" }).alternates.canonical, "/dashboard?view=guide");
  });
});
