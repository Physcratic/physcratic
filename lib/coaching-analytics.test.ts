import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CONSULTATION_CLICK_EVENT, ENTRY_CLICK_EVENT, TUTOR_CLICK_EVENT, coachingEntryHandlers, trackCoachingEntry, trackConsultationClick, trackTutorClick } from "./coaching/analytics";

describe("coaching conversion events", () => {
  it("sends coaching_consultation_click with the pathway", () => {
    const sent: unknown[][] = [];
    trackConsultationClick("IB or A-Level", (...args) => sent.push(args));
    assert.deepEqual(sent, [["coaching_consultation_click", { pathway: "IB or A-Level" }]]);
    assert.equal(CONSULTATION_CLICK_EVENT, "coaching_consultation_click");
  });

  it("sends coaching_tutor_click with no properties", () => {
    const sent: unknown[][] = [];
    trackTutorClick((...args) => sent.push(args));
    assert.deepEqual(sent, [["coaching_tutor_click"]]);
    assert.equal(TUTOR_CLICK_EVENT, "coaching_tutor_click");
  });

  it("never throws, even when analytics fails", () => {
    const broken = () => { throw new Error("analytics is not loaded"); };
    assert.doesNotThrow(() => trackConsultationClick("Not sure yet", broken));
    assert.doesNotThrow(() => trackTutorClick(broken));
  });

  it("is a no-op with the real tracker on the server", () => {
    assert.doesNotThrow(() => trackConsultationClick("Not sure yet"));
    assert.doesNotThrow(() => trackTutorClick());
  });

  it("is wired to the consultation and tutor links", () => {
    const form = readFileSync(new URL("../components/coaching/coaching-form-link.tsx", import.meta.url), "utf8");
    const hero = readFileSync(new URL("../components/coaching/coaching-hero.tsx", import.meta.url), "utf8");
    assert.match(form, /trackTutorClick\(\)/);
    assert.match(form, /trackConsultationClick\(pathway \?\? "none"\)/);
    assert.match(form, /onClick=\{onClick\}/);
    assert.match(hero, /onClick: \(\) => trackConsultationClick\(pathway\)/);
    // A middle-click sends auxclick, not click, so both links handle it too.
    assert.match(form, /onAuxClick=\{onAuxClick\}/);
    assert.match(form, /event\.button === 1/);
    assert.match(hero, /onAuxClick: \(event: React\.MouseEvent\) => \{ if \(event\.button === 1\) trackConsultationClick\(pathway\)/);
  });
});

describe("coaching_entry_click from the dashboard", () => {
  it("sends the place the link was in", () => {
    for (const from of ["topbar", "sidebar", "card"] as const) {
      const sent: unknown[][] = [];
      trackCoachingEntry(from, (...args) => sent.push(args));
      assert.deepEqual(sent, [["coaching_entry_click", { from }]]);
    }
    assert.equal(ENTRY_CLICK_EVENT, "coaching_entry_click");
  });

  it("never throws, and handlers react to click and middle-click only", () => {
    const broken = () => { throw new Error("analytics is not loaded"); };
    assert.doesNotThrow(() => trackCoachingEntry("card", broken));
    const handlers = coachingEntryHandlers("topbar");
    assert.doesNotThrow(() => handlers.onClick());
    assert.doesNotThrow(() => handlers.onAuxClick({ button: 2 }));
  });

  it("is wired to the top bar, sidebar and card, and all three link to /coaching", () => {
    const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    const topNav = read("components/kokonutui/top-nav.tsx");
    const sidebar = read("components/kokonutui/sidebar.tsx");
    const card = read("components/physics/coaching-card.tsx");
    assert.match(topNav, /coachingEntryHandlers\("topbar"\)/);
    assert.match(sidebar, /coachingEntryHandlers\("sidebar"\)/);
    assert.match(card, /coachingEntryHandlers\("card"\)/);
    for (const source of [topNav, sidebar, card]) assert.match(source, /href="\/coaching"/);
  });
});
