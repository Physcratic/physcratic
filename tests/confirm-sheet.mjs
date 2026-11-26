// Problem Studio asks with one bottom sheet, not a native dialog. This answers it for browser tests that do not care about
// the sheet itself, the way page.on("dialog", d => d.accept()) did. It also records what each sheet said.
// mode: "accept" clicks the confirm button, "cancel" clicks Cancel, "manual" leaves the sheet for the test to answer.
export async function autoConfirm(target, mode = "accept") {
  await target.addInitScript((initial) => {
    window.__confirmMode = initial;
    window.__confirmAsked = [];
    const answer = () => {
      const sheet = document.querySelector("[data-confirm-sheet]");
      if (!sheet || sheet.dataset.handled) return;
      sheet.dataset.handled = "1";
      const text = (attr) => document.getElementById(sheet.getAttribute(attr) || "")?.textContent ?? "";
      window.__confirmAsked.push({ title: text("aria-labelledby"), message: text("aria-describedby") });
      if (window.__confirmMode === "manual") return;
      sheet.querySelector(window.__confirmMode === "cancel" ? "[data-confirm-cancel]" : "[data-confirm-action]")?.click();
    };
    new MutationObserver(answer).observe(document, { childList: true, subtree: true });
  }, mode);
}
export const setConfirmMode = (page, mode) => page.evaluate((m) => { window.__confirmMode = m; }, mode);
export const confirmsAsked = (page) => page.evaluate(() => {
  if (!Array.isArray(window.__confirmAsked)) throw new Error("autoConfirm was not installed on this page");
  return window.__confirmAsked;
});
