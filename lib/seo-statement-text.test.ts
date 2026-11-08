import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firstSentence, sentences, sharedSection, statementDescription, statementParagraphs } from "./seo/statement-text";

describe("statement text from a PDF", () => {
  it("drops the header block and joins wrapped lines", () => {
    const text = "Theory\nQ2-1\nEnglish (Official)\nCox's Timepiece (10 points)\nIn 1765, British clockmaker James Cox invented a clock whose only source of energy is the fluctuations\nin atmospheric pressure. Cox's clock used two vessels.\n";
    const [first] = statementParagraphs(text, "Cox's Timepiece");
    assert.equal(first, "In 1765, British clockmaker James Cox invented a clock whose only source of energy is the fluctuations in atmospheric pressure. Cox's clock used two vessels.");
    assert.equal(firstSentence(text, "Cox's Timepiece"), "In 1765, British clockmaker James Cox invented a clock whose only source of energy is the fluctuations in atmospheric pressure.");
  });
  it("skips an olympiad banner and a lettered heading, and keeps a title that is part of the first sentence", () => {
    const banner = "39th International Physics Olympiad - Hanoi - Vietnam - 2008\nTheoretical Problem No. 1\nWATER-POWERED RICE-POUNDING MORTAR\nA. Introduction\nRice is the main staple food of most people in Vietnam.\n";
    assert.equal(firstSentence(banner, "WATER-POWERED RICE-POUNDING MORTAR"), "Rice is the main staple food of most people in Vietnam.");
    const sameWords = "Thermoacoustic Engine\nA thermoacoustic engine is a device that converts heat into acoustic power, or sound waves.\n";
    assert.match(firstSentence(sameWords, "Thermoacoustic Engine"), /^A thermoacoustic engine is a device/);
  });
  it("drops page furniture, soft hyphens, ligatures and glued maths letters", () => {
    const text = "Intro title\nPage 1 /2\nA puck with radius 𝑟and uniform den-\nsity is moving on a horizontal plane with the ﬁrst velocity.\n";
    const [first] = statementParagraphs(text, "Intro title");
    assert.equal(first, "A puck with radius 𝑟 and uniform density is moving on a horizontal plane with the first velocity.");
  });
  it("does not split a sentence after Fig. or e.g.", () => {
    assert.deepEqual(sentences("This problem is about ice, Fig. 3.1(a). Greenland is modelled as an island, e.g. a box. Next one."), ["This problem is about ice, Fig. 3.1(a).", "Greenland is modelled as an island, e.g. a box.", "Next one."]);
  });
  it("makes a 70 to 160 character description", () => {
    const short = "Find x.\n";
    const description = statementDescription(`Heading\n${short}`, "IPhO 2000 problem 1, optics:", "Heading");
    assert.ok(description.length >= 70 || description.startsWith("IPhO 2000"), description);
    const long = `Title\n${"A very long opening sentence that keeps going, ".repeat(8)}and ends here.\n`;
    const trimmed = statementDescription(long, "x", "Title");
    assert.ok(trimmed.length <= 160 && trimmed.length >= 70, `${trimmed.length}`);
    assert.doesNotMatch(trimmed, /[;]/);
  });
  it("splits a shared PDF into its problems, in both layouts", () => {
    const numbered = "1\nThree balls\nBalls A and B are joined by a rod of length l.\n2\nSolenoid\nA solenoid of length 20 cm is wound.\n3\nStaircase\nThe equilibrium shape of bodies.\n";
    assert.equal(sharedSection(numbered, 2), "Solenoid\nA solenoid of length 20 cm is wound.");
    assert.match(sharedSection(numbered, 3)!, /Staircase/);
    const prefixed = "Theoretical Problems. Language: English\nT1: Sliding puck (10 pts)\nA puck moves.\nT2: Floating cylinder (10 pts)\nA cylinder floats.\n";
    assert.equal(sharedSection(prefixed, 1), "A puck moves.");
    assert.equal(sharedSection(prefixed, 2), "A cylinder floats.\n");
    assert.equal(sharedSection("no markers here", 1), undefined);
  });
});
