import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CONSULTATION_CLICK_EVENT, TUTOR_CLICK_EVENT, trackConsultationClick, trackTutorClick } from "./coaching/analytics";

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
  });
});
