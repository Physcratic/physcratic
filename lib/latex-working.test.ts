import assert from "node:assert/strict";
import test from "node:test";
import {
  equationTemplates,
  insertEquation,
  previewWorking,
  workingLimit,
} from "./latex-working";

test("all equation shortcuts produce valid LaTeX previews", () => {
  for (const template of equationTemplates) {
    const inserted = insertEquation("", 0, 0, template.latex)!;
    assert.equal(inserted.value, `$$${template.latex}$$`);
    assert.equal(inserted.selectionStart, 2);
    assert.equal(inserted.selectionEnd, 2 + template.latex.length);
    assert.ok(
      previewWorking(inserted.value).some((block) => block.type === "math"),
    );
    assert.ok(
      !previewWorking(inserted.value).some((block) => block.type === "error"),
    );
  }
});

test("equation insertions respect selection, equation context, and character limit", () => {
  const inserted = insertEquation("Force: mass", 7, 11, "\\frac{a}{b}")!;
  assert.equal(inserted.value, "Force: $$\\frac{mass}{b}$$");
  assert.equal(
    insertEquation("$$x=$$", 4, 4, "\\theta")!.value,
    "$$x=\\theta$$",
  );
  assert.equal(insertEquation("x".repeat(workingLimit), 0, 0, "x"), null);
});

test("preview supports prose, multiple equations, unfinished input, and invalid syntax", () => {
  const preview = previewWorking(
    "Use Newton's law.\n$$F=ma$$\nThen $$a=\\frac{F}{m}$$",
  );
  assert.equal(preview.filter((block) => block.type === "math").length, 2);
  assert.ok(
    preview.some(
      (block) => block.type === "text" && block.value.includes("Newton"),
    ),
  );
  assert.ok(previewWorking("$$x").some((block) => block.type === "error"));
  assert.ok(previewWorking("$$$$").some((block) => block.type === "error"));
  assert.ok(
    previewWorking("$$\\notacommand{x}$$").some(
      (block) => block.type === "error",
    ),
  );
});

test("user LaTeX cannot enable trusted HTML or javascript links", () => {
  for (const expression of [
    "\\href{javascript:alert(1)}{click}",
    "\\htmlClass{attack}{x}",
  ]) {
    const math = previewWorking(`$$${expression}$$`).filter(
      (block) => block.type === "math",
    );
    assert.ok(
      math.every(
        (block) =>
          !block.value.includes('href="javascript:') &&
          !block.value.includes('class="attack"'),
      ),
    );
  }
});
