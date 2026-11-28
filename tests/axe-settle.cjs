// Shared by the browser suites that run axe. axe reads computed colours, so a
// reading taken while a finite animation or transition is still running can
// report a blended colour that never appears on a settled page.
// settleAnimations waits for those to finish. It changes no rule, threshold or exclusion.
const FLAG = Symbol.for("physcratic.axeSettle");

async function settleAnimations(page, timeoutMs = 2000) {
  try {
    await page.evaluate(async (timeout) => {
      const deadline = performance.now() + timeout;
      const finite = () => document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
      for (let pass = 0; pass < 4; pass += 1) {
        const pending = finite();
        const left = deadline - performance.now();
        if (!pending.length || left <= 0) break;
        let timer;
        const timedOut = new Promise((resolve) => { timer = setTimeout(resolve, left); });
        await Promise.race([Promise.allSettled(pending.map((a) => a.finished)), timedOut]);
        clearTimeout(timer);
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, timeoutMs);
  } catch {
    // A closed or navigating page has nothing to settle. axe reports its own failure.
  }
}

// Patch AxeBuilder.analyze once so every run in a suite settles first.
function settleAxeBuilder(AxeBuilder) {
  const proto = AxeBuilder?.prototype;
  if (!proto || proto[FLAG]) return AxeBuilder;
  const analyze = proto.analyze;
  proto.analyze = async function settledAnalyze(...args) {
    await settleAnimations(this.page);
    return analyze.apply(this, args);
  };
  proto[FLAG] = true;
  return AxeBuilder;
}

module.exports = { settleAnimations, settleAxeBuilder };
