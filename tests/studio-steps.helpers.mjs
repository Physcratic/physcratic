// Moving through the five Studio steps in a browser suite, at any width.
export const STEP_ORDER = ["Question", "Answer", "Worked solution", "Details", "Review"];

/** The step list. On a phone it is behind the compact stepper, which this opens first. */
async function stepList(page) {
  const nav = page.getByRole("navigation", { name: "Steps" });
  const list = nav.getByRole("list");
  if (!(await list.isVisible())) await nav.getByRole("button", { name: / of 5$/ }).click();
  return list;
}

/** Opens a step from the rail or the stepper and waits for its heading. */
export async function goStep(page, name) {
  const list = await stepList(page);
  await list.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await page.getByRole("heading", { level: 2, name, exact: true }).waitFor();
}

/** The step on screen, from the step marked as current. */
export async function currentStep(page) {
  const current = page.locator('nav[aria-label="Steps"] [aria-current="step"]');
  const text = await current.textContent();
  return STEP_ORDER.find((name) => text.startsWith(name));
}

/** The bar at the bottom of the editor. */
export const studioBar = (page) => page.locator("[data-studio-bar]");
export const barStatus = async (page) => (await studioBar(page).locator("p[role=status], button[aria-expanded]").first().innerText()).replace(/\s+/g, " ").trim();
