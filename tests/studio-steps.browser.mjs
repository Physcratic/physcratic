// The five Studio steps in the real workspace, API and disposable PostgreSQL of tests/problem-authoring.browser.mjs.
// A problem is filled in through Question, Answer, Worked solution, Details and Review at 375 and 1440, light and dark.
// Checks the rail and the phone stepper, the bar text and its list, Publish disabled while anything is left, focus on each
// step heading, the bar never covering a focused equation field, the keyboard, axe on every step and no sideways scroll.
import assert from "node:assert/strict";
import { autoConfirm } from "./confirm-sheet.mjs";
import { STEP_ORDER, barStatus, currentStep, goStep, studioBar } from "./studio-steps.helpers.mjs";

// The data-simple-field targets back to the Simple fields fieldStep() reads.
const KIND = { q: "question", p: "picture", o: "options", a: "answer", u: "units", s: "solution", w: "solution-options" };
const fieldOf = (target) => {
  if (target === "p:main") return "picture:main";
  if (target === "o:problem") return "options:problem";
  const [kind, id] = target.split(":");
  return id ? `${KIND[kind] ?? kind}:${id}` : target;
};
/** Every field on the page is inside the step section fieldStep() names, and every kind of field is checked. */
async function fieldsOnTheirSteps(page, tag) {
  const { fieldStep } = await import("../components/authoring/studio-steps.ts");
  const found = await page.evaluate(() => [...document.querySelectorAll("[data-simple-field]")].map((el) => [el.getAttribute("data-simple-field"), el.closest("[data-studio-step]")?.getAttribute("data-studio-step") ?? null]));
  for (const [target, on] of found) assert.equal(on, fieldStep(fieldOf(target)), `${tag}: ${target} is on the step that holds it`);
  // A part's fields by their kind, the problem's fields by name.
  const kinds = new Set(found.map(([target]) => (/^(p:main|o:problem)$/.test(target) || !target.includes(":") ? target : target.split(":")[0])));
  // The source field is only there for an adapted problem. studio-simple checks the bar focuses it.
  for (const want of ["q", "p", "o", "a", "u", "s", "w", "p:main", "o:problem", "title", "rights", "difficulty", "topics", "review"])
    assert.ok(kinds.has(want), `${tag}: the check covers ${want} (${[...kinds].join(", ")})`);
}

export async function runStudioStepsBrowser({ browser, origin, pool, AxeBuilder }) {
  let n = 9300;
  for (const width of [375, 1440]) for (const theme of ["light", "dark"]) {
    const tag = `${width} ${theme}`;
    const owner = `pdf-studio-${n++}-${theme}`;
    await pool.query('INSERT INTO "user"(id) VALUES($1) ON CONFLICT DO NOTHING', [owner]);
    const context = await browser.newContext({ viewport: { width, height: width === 375 ? 800 : 1000 } });
    await context.addCookies([{ name: "studio_author", value: owner, url: origin }]);
    await context.addInitScript((t) => {
      localStorage.setItem("physcratic.tour.studio.v1", "seen");
      addEventListener("DOMContentLoaded", () => document.documentElement.classList.toggle("dark", t === "dark"), { once: true });
    }, theme);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await autoConfirm(page);
    const axe = async (label) => {
      // Pictures of each step for the review. Only when STUDIO_STEPS_SHOTS is set.
      if (process.env.STUDIO_STEPS_SHOTS) await page.screenshot({ path: `${process.env.STUDIO_STEPS_SHOTS}/steps-${width}-${theme}-${label.replace(/\s+/g, "-").toLowerCase()}.png` });
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((x) => x.target).join(" ")}`), [], `${tag} ${label}: axe`);
    };
    const noSideways = async (label) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${tag} ${label}: no sideways scroll`);
    const focusedHeading = () => page.evaluate(() => (document.activeElement?.tagName === "H2" ? document.activeElement.textContent : ""));
    const next = () => studioBar(page).getByRole("button", { name: "Next", exact: true });
    const publish = () => studioBar(page).getByRole("button", { name: "Publish", exact: true });

    await page.goto(origin);
    await page.getByRole("button", { name: "New problem", exact: true }).click();
    await page.getByRole("heading", { level: 2, name: "Question", exact: true }).waitFor();
    assert.equal(await currentStep(page), "Question", `${tag}: a new draft opens on Question`);

    // The rail on a wide screen, the compact stepper on a phone. Every step is a 44px button with an icon and words.
    const nav = page.getByRole("navigation", { name: "Steps" });
    const toggle = nav.getByRole("button", { name: / of 5$/ });
    if (width < 768) {
      assert.equal(await toggle.isVisible(), true, `${tag}: the phone has the stepper`);
      assert.match((await toggle.innerText()).replace(/\s+/g, " "), /^Question 1 of 5$/);
      assert.equal(await nav.getByRole("list").isVisible(), false, `${tag}: no rail on a phone`);
      await toggle.click();
    } else assert.equal(await toggle.isVisible(), false, `${tag}: the wide screen has the rail`);
    const items = nav.getByRole("listitem").getByRole("button");
    assert.equal(await items.count(), 5);
    for (let i = 0; i < 5; i++) {
      const box = await items.nth(i).boundingBox();
      assert.ok(box.height >= 44, `${tag}: ${STEP_ORDER[i]} is at least 44px`);
      assert.equal(await items.nth(i).locator("svg").count(), 1, `${tag}: ${STEP_ORDER[i]} has an icon`);
    }
    assert.equal(await items.nth(0).getAttribute("aria-current"), "step");
    assert.match((await items.nth(0).innerText()).replace(/\s+/g, " "), /^Question 1 thing left$/, `${tag}: Question says what is left in words`);
    assert.match((await items.nth(3).innerText()).replace(/\s+/g, " "), /^Details 2 things left$/);
    if (width < 768) await toggle.click();

    // The bar: what is left, Back and Next. Publish waits on Review.
    assert.equal(await barStatus(page), "3 things left");
    assert.equal(await studioBar(page).getByRole("button", { name: "Back", exact: true }).isDisabled(), true, `${tag}: no Back on the first step`);
    assert.equal(await publish().count(), 0);
    await noSideways("Question");
    await axe("Question");

    // Question: the question itself comes first.
    const part = page.getByRole("region", { name: /^(Part a|Question and answer)$/, exact: true });
    const question = part.getByRole("textbox", { name: "What's the question?" });
    await question.click();
    await question.pressSequentially("Bob pushes a cart up a ramp. How hard does he push?");
    await page.waitForURL((url) => url.searchParams.has("draft"));
    const id = new URL(page.url()).searchParams.get("draft");
    await page.getByText("All changes saved").first().waitFor();
    assert.equal(await currentStep(page), "Question", `${tag}: the step is kept while the author edits and it saves`);
    assert.equal(await barStatus(page), "2 things left", `${tag}: the title came from the question, the rating and the tick are left`);

    // Next moves focus to the step heading and scrolls to the top.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await next().click();
    await page.getByRole("heading", { level: 2, name: "Answer", exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.tagName === "H2");
    assert.equal(await focusedHeading(), "Answer", `${tag}: focus is on the Answer heading`);
    const top = await page.locator("[data-studio-step=answer]").evaluate((el) => el.getBoundingClientRect().top);
    assert.ok(top >= 0 && top < 400, `${tag}: the step starts at the top (${top})`);
    await noSideways("Answer");
    await axe("Answer");

    // The bar never covers a focused equation field. Put the field under the bar, then focus it.
    const field = part.locator("math-field").first();
    await field.waitFor({ timeout: 20000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const under = await page.evaluate(() => {
      const bar = document.querySelector("[data-studio-bar]").getBoundingClientRect();
      const f = document.querySelector('[data-studio-step=answer] math-field').getBoundingClientRect();
      return f.top - bar.top + 4;
    });
    if (under > 0) await page.evaluate((y) => window.scrollBy(0, y), under);
    await field.evaluate((el) => el.focus());
    await page.waitForTimeout(300);
    const cover = await page.evaluate(() => {
      const bar = document.querySelector("[data-studio-bar]").getBoundingClientRect();
      const f = document.activeElement.closest("math-field")?.getBoundingClientRect() ?? document.activeElement.getBoundingClientRect();
      return { fieldBottom: f.bottom, barTop: bar.top, padding: getComputedStyle(document.documentElement).scrollPaddingBottom, bar: bar.height };
    });
    assert.ok(cover.fieldBottom <= cover.barTop + 1, `${tag}: the focused equation field is above the bar ${JSON.stringify(cover)}`);
    assert.ok(Math.abs(parseFloat(cover.padding) - cover.bar) < 1, `${tag}: the scroll padding is the bar's height ${JSON.stringify(cover)}`);
    await page.keyboard.type("12");
    await part.getByLabel("Unit (optional)").fill("N");

    await next().click();
    await page.getByRole("heading", { level: 2, name: "Worked solution", exact: true }).waitFor();
    const solution = part.getByRole("textbox", { name: "Worked solution (required)" });
    await solution.click();
    await solution.pressSequentially("Jeff measures the ramp. Resolve the weight along it.");
    await noSideways("Worked solution");
    await axe("Worked solution");

    // Review before Details is filled in: Publish is there and disabled, and the bar says why.
    await goStep(page, "Review");
    assert.equal(await publish().isDisabled(), true, `${tag}: Publish waits while anything is left`);
    assert.equal(await publish().getAttribute("aria-describedby"), "studio-bar-left");
    assert.equal(await barStatus(page), "2 things left");
    await studioBar(page).getByRole("button", { name: "2 things left" }).click();
    await studioBar(page).getByRole("button", { name: "Details: Add a difficulty rating from 0 to 4,000." }).click();
    assert.equal(await currentStep(page), "Details", `${tag}: the item opens its step`);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-simple-field")), "difficulty", `${tag}: and focuses its field`);
    await page.keyboard.type("1200");
    await page.getByLabel(/I wrote this problem and I'm happy to share it on Physcratic/).check();
    await page.getByText("All changes saved").first().waitFor();
    assert.equal(await barStatus(page), "Ready to publish");
    await noSideways("Details");
    await axe("Details");

    // The keyboard: Escape does nothing to the steps, the steps and the bar work with Enter.
    await page.keyboard.press("Escape");
    assert.equal(await currentStep(page), "Details", `${tag}: Escape keeps the step`);
    if (width < 768) { await toggle.focus(); await page.keyboard.press("Enter"); }
    await items.nth(4).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { level: 2, name: "Review", exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.tagName === "H2");
    assert.equal(await focusedHeading(), "Review");
    await fieldsOnTheirSteps(page, tag);
    // Review: the summary of the steps and the student preview. No fields.
    const review = page.locator("[data-studio-step=review]");
    assert.equal(await review.locator("input, textarea, math-field, select").count(), 0, `${tag}: Review has no fields`);
    assert.deepEqual((await review.getByRole("listitem").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim()), ["Question Done", "Answer Done", "Worked solution Done", "Details Done"]);
    await review.getByRole("button", { name: "Student preview", exact: true }).click();
    await page.getByRole("article", { name: "Student-facing preview" }).waitFor();
    await page.getByRole("button", { name: "Write", exact: true }).click();
    assert.equal(await currentStep(page), "Review", `${tag}: back from the preview on the same step`);
    await noSideways("Review");
    await axe("Review");
    assert.equal(await publish().isEnabled(), true, `${tag}: Publish is ready with nothing left`);
    await publish().focus();
    await page.keyboard.press("Enter");
    const end = Date.now() + 20000;
    while ((await pool.query("SELECT state FROM authored_problem WHERE id=$1", [id])).rows[0]?.state !== "published") {
      assert.ok(Date.now() < end, `${tag}: publishes`);
      await page.waitForTimeout(100);
    }
    await studioBar(page).getByRole("button", { name: "Publish new version", exact: true }).waitFor();
    assert.deepEqual(errors, [], `${tag}: no page errors`);
    await context.close();
  }

  // Publish with nothing left on the server, while Simple still asks for the worked solution: it opens that step.
  {
    const owner = "pdf-studio-9390-light";
    await pool.query('INSERT INTO "user"(id) VALUES($1) ON CONFLICT DO NOTHING', [owner]);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies([{ name: "studio_author", value: owner, url: origin }]);
    await context.addInitScript(() => localStorage.setItem("physcratic.tour.studio.v1", "seen"));
    const page = await context.newPage();
    await autoConfirm(page);
    await page.goto(origin);
    await page.getByRole("button", { name: "New problem", exact: true }).click();
    const part = page.getByRole("region", { name: /^(Part a|Question and answer)$/, exact: true });
    await part.getByRole("textbox", { name: "What's the question?" }).click();
    await page.keyboard.type("Jeff drops a ball. How long does it fall?");
    await goStep(page, "Answer");
    await part.locator("math-field").first().click();
    await page.keyboard.type("2");
    await goStep(page, "Details");
    await page.getByLabel("Difficulty rating", { exact: true }).fill("900");
    await page.getByLabel(/I wrote this problem and I'm happy to share it on Physcratic/).check();
    await page.getByText("All changes saved").first().waitFor();
    assert.equal(await barStatus(page), "Ready to publish", "the worked solution is not counted");
    await goStep(page, "Review");
    await studioBar(page).getByRole("button", { name: "Publish", exact: true }).click();
    await page.getByRole("heading", { level: 2, name: "Worked solution", exact: true }).waitFor();
    assert.equal(await currentStep(page), "Worked solution", "Publish opens the step Simple still asks about");
    await page.getByText("Add the worked solution.", { exact: true }).waitFor();
    await context.close();
  }

  // The Studio tour opens the step each of its targets is on, in order.
  {
    const owner = "pdf-studio-9391-light";
    await pool.query('INSERT INTO "user"(id) VALUES($1) ON CONFLICT DO NOTHING', [owner]);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies([{ name: "studio_author", value: owner, url: origin }]);
    await context.addInitScript(() => localStorage.setItem("physcratic.tour.studio.v1", "seen"));
    const page = await context.newPage();
    await page.goto(origin);
    await page.getByRole("button", { name: "New problem", exact: true }).click();
    await page.getByRole("heading", { level: 2, name: "Question", exact: true }).waitFor();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("physcratic:tour", { detail: { id: "studio" } })));
    const { tours } = await import("../components/tour/tours.ts");
    const names = { question: "Question", answer: "Answer", "worked-solution": "Worked solution", details: "Details", review: "Review" };
    for (const step of tours.studio.steps) {
      const card = page.locator("[data-tour-card]");
      await card.getByText(step.title, { exact: true }).first().waitFor({ timeout: 8000 });
      await page.locator("[data-tour-ring]").waitFor({ timeout: 8000 });
      assert.equal(await currentStep(page), names[step.reveal], `the tour step ${step.id} is on ${step.reveal}`);
      await card.getByRole("button", { name: /^(Next|Done)$/ }).click();
    }
    await context.close();
  }
  console.log("PASS Studio steps: five steps at 375 and 1440 in light and dark, rail and phone stepper, bar text and list, Publish only with nothing left, focus on each step, bar never over a focused equation field, keyboard, axe on every step, no sideways scroll, Publish to a Simple ask, the tour across steps.");
}
