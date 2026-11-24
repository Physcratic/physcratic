import assert from "node:assert/strict";
import { join } from "node:path";

const collection = "/api/arena/collection";
const arenaUrl = "/dashboard?view=problems";
const target = "arena:arena-mind-the-gap";
const first = "arena:arena-cat-on-a-plank";
const area = page => page.locator("#arena-results");
const cards = page => area(page).locator("[data-problem-card]");
const card = (page, key) => area(page).locator(`[data-problem-card="${key}"]`);
const next = page => area(page).getByRole("button", { name:"Next page", exact:true });
const prev = page => area(page).getByRole("button", { name:"Previous page", exact:true });
const search = page => page.getByPlaceholder("Search by problem or tag…");
const badge = page => area(page).getByText("Completed", {exact:true});
const getCollection = response => new URL(response.url()).pathname === collection;
const completed = (page,key) => card(page,key).getByText("Completed",{exact:true});

async function noPrevious(page) {
  await prev(page).waitFor();
  assert.equal(await prev(page).isDisabled(),true);
}

export async function verifyArenaPersonalization({ origin, pool, open, users, switchSession, toggle, screenshots, AxeBuilder, authoredId }) {
  const { a, b, anotherA, unverified } = users;
  // Clear the history population from the Phase 2 browser check before testing catalogue order.
  await pool.query("DELETE FROM personal_problem_completion WHERE user_id=ANY($1::text[])", [["student-a","student-b"]]);
  await pool.query("INSERT INTO personal_problem_completion(user_id,problem_key) VALUES ('student-a',$1),('student-a',$2),('student-b',$3)",
    [target,`authored:${authoredId}`,first]);
  const { page, context } = await open(a);
  try {
    // Exercise late responses even if the transport cannot honor cancellation.
    await context.addInitScript(() => {
      const fetch = window.fetch.bind(window);
      window.fetch = (input, options) => typeof input === "string" && input.startsWith("/api/arena/collection?")
        ? fetch(input,{...options,signal:undefined}) : fetch(input,options);
    });
    await page.goto(origin+arenaUrl);
    await cards(page).first().waitFor();
    assert.equal(await cards(page).count(),24);
    assert.equal(await cards(page).first().getAttribute("data-problem-card"),first);
    assert.equal(await badge(page).count(),0,"Unfinished rows fill the first page.");
    const earlier = await cards(page).evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-problem-card")));
    await next(page).click();
    await completed(page,target).waitFor();
    assert.equal(await area(page).getByRole("heading",{level:2}).evaluate(el=>el===document.activeElement),true);
    const tail = await cards(page).evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-problem-card")));
    assert.equal(new Set([...earlier,...tail]).size,earlier.length+tail.length);
    await completed(page,`authored:${authoredId}`).waitFor();

    // Mark an unfinished second-page problem from its real reader, then return to a restarted collection.
    const candidate = cards(page).filter({hasNotText:"Completed"}).first();
    const key = await candidate.getAttribute("data-problem-card");
    assert.ok(key?.startsWith("arena:"));
    const title = await candidate.getByRole("heading").innerText();
    const reader = "/dashboard/problems/"+key.slice(6);
    await candidate.getByRole("link",{name:/^Open problem/}).click();
    await page.waitForURL(origin+reader);
    await toggle(page,false);
    await page.goBack();
    await cards(page).first().waitFor();
    await noPrevious(page);

    // An exact title search still finds the marked problem and retains a working reader link.
    await search(page).fill(title);
    await completed(page,key).waitFor();
    await card(page,key).getByRole("link",{name:/^Open problem/}).focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(origin+reader);
    await toggle(page,true);
    await page.goBack();
    await card(page,key).waitFor();
    assert.equal(await completed(page,key).count(),0);
    await noPrevious(page);

    // Hold an old first-page cursor while a second, authenticated session for the same account marks a problem.
    await search(page).fill("");
    await card(page,first).waitFor();
    const other = await open(anotherA);
    try {
      const write = await other.context.request.put(origin+"/api/personal-completions",{
        headers:{origin,"X-Community-Account":"student-a"},data:{key:first,completed:true},
      });
      assert.equal(write.status(),200);
      const stale = page.waitForResponse(r=>getCollection(r)&&r.status()===409);
      await next(page).click();
      assert.deepEqual(await (await stale).json(),{code:"COMPLETION_ORDER_CHANGED"});
      await cards(page).first().waitFor();
      await noPrevious(page);
      assert.notEqual(await cards(page).first().getAttribute("data-problem-card"),first);
    } finally { await other.context.close(); }

    // Delay A's personalized response until B's list is visible on the same mounted screen.
    await search(page).fill("Mind the Gap");
    await completed(page,target).waitFor();
    let release;
    const held = new Promise(resolve=>{release=resolve;});
    let loaded;
    const received = new Promise(resolve=>{loaded=resolve;});
    const receivedA = r=>getCollection(r)&&r.request().headers()["x-community-account"]==="student-a";
    await page.route("**/api/arena/collection?*",async route=>{
      if(route.request().headers()["x-community-account"]!=="student-a") return route.continue();
      const response = await route.fetch();
      loaded(response.status());
      await held;
      await route.fulfill({response});
    });
    const aRequest = page.waitForRequest(r=>new URL(r.url()).pathname===collection&&r.headers()["x-community-account"]==="student-a");
    const late = page.waitForResponse(receivedA);
    try {
      await area(page).getByRole("button",{name:"Refresh collection"}).click();
      await aRequest;
      assert.equal(await received,200);
      const bResponse = page.waitForResponse(r=>getCollection(r)&&r.request().headers()["x-community-account"]==="student-b");
      await switchSession(page,b,"student-b");
      assert.equal((await bResponse).status(),200);
      await card(page,target).waitFor();
      assert.equal(await completed(page,target).count(),0);
    } finally { release(); }
    assert.equal((await late).status(),200);
    await page.unrouteAll({behavior:"wait"});
    assert.equal(await completed(page,target).count(),0);
    const mismatch = await context.request.get(origin+collection,{headers:{"X-Community-Account":"student-a"}});
    assert.equal(mismatch.status(),409);
    console.log("PASS Arena reader round trip, exact search, automatic stale restart and delayed account switch");
  } finally { await context.close(); }

  for (const [cookie, status] of [[undefined,undefined],[unverified,"active"]]) {
    const { page, context } = await open(cookie);
    try {
      const response = page.waitForResponse(getCollection);
      await page.goto(origin+"/problems?q=Mind+the+Gap");
      assert.equal((await (await response).json()).personalization,status);
      await card(page,target).waitFor();
      assert.equal(await completed(page,target).count(),0);
    } finally { await context.close(); }
  }

  await pool.query("ALTER TABLE personal_problem_completion RENAME TO completion_fixture_unavailable");
  try {
    const { page, context } = await open(a);
    try {
      await page.goto(origin+"/problems?q=Mind+the+Gap");
      await area(page).getByText("Completion status is unavailable. Browsing by rating.",{exact:true}).waitFor();
      await card(page,target).waitFor();
      assert.equal(await badge(page).count(),0);
    } finally { await context.close(); }
  } finally {
    await pool.query("ALTER TABLE completion_fixture_unavailable RENAME TO personal_problem_completion");
  }

  for (const width of [375,1440]) for (const theme of ["light","dark"]) {
    const { page, context } = await open(a,width,theme);
    try {
      await page.goto(origin+"/problems?q=Mind+the+Gap");
      await completed(page,target).waitFor();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.equal(await completed(page,target).locator("svg[aria-hidden=true]").count(),1);
      const link = card(page,target).getByRole("link",{name:/^Open problem/});
      await link.focus();
      assert.ok((await link.boundingBox()).height>=44);
      assert.deepEqual((await new AxeBuilder({page}).include("#arena-results").analyze()).violations,[]);
      await area(page).scrollIntoViewIfNeeded();
      if(screenshots) await page.screenshot({path:join(screenshots,`arena-collection-${width}-${theme}.png`)});
    } finally { await context.close(); }
  }
  console.log("PASS Arena unverified and guest audiences, unavailable fallback, four theme and viewport screenshots, and axe checks");
}
