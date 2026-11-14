// Real UI + production API factories, disposable PostgreSQL and an in-memory private Blob boundary.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdtemp, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { Pool } from "pg";
import sharp from "sharp";
import { createCommunityProfileApi } from "../lib/community/profile-api.ts";
import { createCommunityProfileRoute } from "../lib/community/profile-route.ts";
import { createProfileMediaApi } from "../lib/community/profile-media-api.ts";
import { createProfileMediaRoute } from "../lib/community/profile-media-route.ts";
import { isAllowedSubmissionOrigin } from "../lib/submission-security.ts";

const require = createRequire(import.meta.url), tooling = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"));
const { chromium } = tooling("playwright"), { default: AxeBuilder } = tooling("@axe-core/playwright");
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const target = new URL(process.env.AUTHORING_TEST_DATABASE_URL || "http://invalid");
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.pathname, "/physcratic_authoring_test");
const schema = `profile_browser_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString: target.href, max: 1 });
const pool = new Pool({ connectionString: target.href, options: `-c search_path=${schema}`, max: 5 });
await mkdir(join(process.cwd(), "work"), { recursive: true });
const temp = await mkdtemp(join(process.cwd(), "work/community-browser-"));
let server, browser, origin, failPut = false, failProfiles = false;
const accountGuardOnly = process.env.COMMUNITY_PROFILE_ACCOUNT_GUARD_ONLY === "1";
const flags = { profiles: true, media: !accountGuardOnly }, objects = new Map(), requests = [], bodies = [];
const storage = {
  async put(path, bytes) { if (failPut) throw new Error("PRIVATE_STORAGE_SENTINEL"); objects.set(path, bytes); },
  async get(path) { const bytes = objects.get(path); return bytes ? new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) : null; },
  async del(path) { objects.delete(path); },
};
const identity = request => {
  const id = request.headers.get("x-test-session");
  return id && id !== "guest" ? { id: id === "unverified" ? "owner" : id, emailVerified: id !== "unverified" } : null;
};
const deps = { pool, user: async request => identity(request), origin: request => isAllowedSubmissionOrigin(request, [origin]) };
const profileApi = createCommunityProfileApi(deps), mediaApi = createProfileMediaApi({ ...deps, storage });
const profiles = createCommunityProfileRoute(() => flags.profiles, async () => ({ communityProfileApi: profileApi }));
const images = createProfileMediaRoute(() => flags.profiles && flags.media, async () => ({ profileMediaApi: mediaApi }));
const resetLimits = () => pool.query("TRUNCATE community_profile_write_limit,community_profile_media_limit");
const png = accountGuardOnly ? null : await sharp({ create: { width: 320, height: 160, channels: 3, background: "#628b9a" } }).png().toBuffer();
const replacement = accountGuardOnly ? null : await sharp({ create: { width: 320, height: 160, channels: 3, background: "#9a7162" } }).jpeg().toBuffer();
let assertions = 0;
const check = (actual, expected, note) => { assert.deepEqual(actual, expected, note); assertions++; };
try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await pool.query(`CREATE TABLE "user"(id text PRIMARY KEY); INSERT INTO "user" VALUES('owner'),('other')`);
  for (const name of ["0007_community_profile", "0008_community_profile_media"])
    await pool.query(`BEGIN; ${await readFile(`migrations/${name}.up.sql`, "utf8")} COMMIT;`);
  await build({ entryPoints: ["tests/community-profile-harness.tsx"], outfile: join(temp,"bundle.js"), bundle: true,
    platform: "browser", jsx: "automatic", alias: { "@": process.cwd() },
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" }, logLevel: "silent" });
  execFileSync("node_modules/.bin/tailwindcss", ["-i","app/globals.css","-o",join(temp,"style.css")], { stdio: "pipe" });
  const bundle = await readFile(join(temp,"bundle.js"),"utf8");
  for (const privateName of ["community_profile_media_limit", "createProfileMediaApi", "PRIVATE_STORAGE_SENTINEL", "COMMUNITY_PROFILE_BLOB_STORE_ID"])
    check(bundle.includes(privateName), false, "server storage/query code stays out of the browser");
  server = createServer(async (req,res) => {
    try {
      const url = new URL(req.url, origin);
      if (["/bundle.js","/style.css"].includes(url.pathname)) {
        res.setHeader("Content-Type", url.pathname.endsWith("js") ? "application/javascript" : "text/css");
        res.end(await readFile(join(temp,url.pathname.slice(1)))); return;
      }
      const cookie = req.headers.cookie?.match(/(?:^|;\s*)test_user=([^;]+)/)?.[1] || "guest";
      const sessionId = ["owner","other","unverified"].includes(cookie) ? cookie : "guest";
      if (url.pathname === "/api/auth/get-session") {
        const user = sessionId === "guest" ? null : { id: sessionId === "unverified" ? "owner" : sessionId,
          name: "PRIVATE_ACCOUNT_NAME", email: "PRIVATE_ACCOUNT_EMAIL@example.invalid", emailVerified: sessionId !== "unverified",
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const session = user ? { user, session: { id:"synthetic", token:"synthetic-session-only", userId:user.id,
          createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), expiresAt:new Date(Date.now()+86400000).toISOString() } } : null;
        res.setHeader("Content-Type","application/json"); res.end(JSON.stringify(session)); return;
      }
      if (url.pathname.startsWith("/api/community/")) {
        const recorded = { path:url.pathname, method:req.method, sessionId, accountId:req.headers["x-community-account"] };
        requests.push(recorded);
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const headers = new Headers(Object.entries(req.headers).flatMap(([key,value]) => typeof value === "string" ? [[key,value]] : []));
        headers.set("x-test-session",sessionId);
        const request = new Request(url, { method:req.method, headers, body:["GET","HEAD"].includes(req.method) ? undefined : new Uint8Array(Buffer.concat(chunks)) });
        let response;
        if (url.pathname === "/api/community/profile") response = failProfiles ? Response.json({ error:"PRIVATE_DB_SENTINEL" },{status:503}) : await profiles("own",request);
        else if (/^\/api\/community\/profile\/[^/]+$/.test(url.pathname)) response = await profiles("public",request,url.pathname.split("/").at(-1));
        else if (url.pathname === "/api/community/profile-media") response = await images("metadata",request);
        else if (url.pathname.startsWith("/api/community/profile-media/image/")) response = await images("image",request,url.pathname.split("/").at(-1));
        else if (url.pathname === "/api/community/profile-media/cleanup") response = await images("cleanup",request);
        else response = await images(req.method === "PUT" ? "upload" : "remove",request,url.pathname.split("/").at(-1));
        recorded.status = response.status;
        const body = new Uint8Array(await response.arrayBuffer());
        if (response.headers.get("content-type")?.includes("json")) bodies.push(Buffer.from(body).toString());
        res.writeHead(response.status,Object.fromEntries(response.headers));res.end(body);return;
      }
      res.setHeader("Content-Type","text/html");
      res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Physcratic profile test</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script>window.__COMMUNITY_TEST_FLAGS__=${JSON.stringify(flags)}</script><script src="/bundle.js"></script></body></html>`);
    } catch(e) { console.error(e);res.writeHead(500);res.end("Harness failure"); }
  });
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve)); origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath:process.env.CHROMIUM_PATH } : {}), headless:true });
  const context = await browser.newContext({ viewport:{width:1440,height:1000}, reducedMotion:"reduce" });
  await context.addCookies([{ name:"test_user",value:"owner",url:origin }]);
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(15000);page.on("pageerror",error => errors.push(error.message));page.on("dialog",dialog=>dialog.accept());
  const waitText = text => page.getByText(text,{exact:true}).waitFor();
  if (accountGuardOnly) {
    // Reuse the existing real Settings/setup UI and API server. No media,
    // viewport, axe or theme sweep is repeated in this focused CI mode.
    const ownResponse = method => page.waitForResponse(r => new URL(r.url()).pathname === "/api/community/profile" && r.request().method() === method);
    await page.goto(`${origin}/dashboard`);
    await page.getByRole("heading",{name:"Set up your community profile"}).waitFor();
    check(requests.some(r=>r.path==="/api/community/profile"&&r.method==="GET"&&r.accountId==="owner"&&r.status===200),true,"setup sends displayed-account header");
    await page.goto(`${origin}/settings?onboarding=1`);
    await page.getByLabel("Permanent username").waitFor();
    check(requests.filter(r=>r.path==="/api/community/profile"&&r.method==="GET").every(r=>r.accountId==="owner"),true,"own editor GETs carry the account header");
    check(await page.getByLabel("Make my profile public").isChecked(),false,"new profile stays private");
    await page.getByLabel("Permanent username").fill("guard_owner");
    await page.getByLabel("Display name",{exact:true}).fill("Owner draft");
    // Change only the cookie, leaving the visible session/form as owner.
    await context.addCookies([{name:"test_user",value:"other",url:origin}]);
    const rejected = ownResponse("PATCH");
    await page.getByRole("button",{name:"Create profile",exact:true}).click();
    const stale = await rejected;
    check(stale.request().headers()["x-community-account"],"owner","PATCH binds the displayed account");
    check(stale.status(),409,"stale-cookie PATCH is rejected");
    check((await stale.json()).code,"ACCOUNT_CHANGED");
    await page.getByRole("alert").filter({hasText:"Your account changed. Reload the page before continuing."}).waitFor();
    check((await pool.query("SELECT count(*)::int n FROM community_profile WHERE user_id='other'")).rows[0].n,0,"no profile published for the new cookie account");
    check((await pool.query("SELECT count(*)::int n FROM community_profile_write_limit WHERE user_id='other'")).rows[0].n,0,"rejected write consumes no other-account quota");
    check((await context.request.get(`${origin}/api/community/profile`,{headers:{"X-Community-Account":"owner"}})).status(),409,"stale own GET rejected");
    check((await context.request.get(`${origin}/api/community/profile`)).status(),409,"old authenticated client fails closed without the header");
    await context.addCookies([{name:"test_user",value:"owner",url:origin}]);
    await page.reload();await page.getByLabel("Permanent username").waitFor();
    await page.getByLabel("Permanent username").fill("guard_owner");
    await page.getByLabel("Display name",{exact:true}).fill("Owner profile");
    const accepted = ownResponse("PATCH");
    await page.getByRole("button",{name:"Create profile",exact:true}).click();
    check((await accepted).status(),201,"matching displayed account saves");
    await waitText("Profile saved.");
    check((await pool.query("SELECT public_visibility FROM community_profile WHERE user_id='owner'")).rows[0].public_visibility,false);
    const guest = await browser.newContext();
    try {
      check((await guest.request.get(`${origin}/api/community/profile/guard_owner`)).status(),404);
      await page.getByLabel("Make my profile public").check();
      const published = ownResponse("PATCH");
      await page.getByRole("button",{name:"Save changes",exact:true}).click();
      check((await published).status(),200,"explicit visibility change is committed");
      await waitText("Profile saved.");
      const publicProfile = await guest.request.get(`${origin}/api/community/profile/guard_owner`);
      check(publicProfile.status(),200,"public projection needs no private account header");
      check(Object.keys((await publicProfile.json()).profile).sort(),["bio","displayName","educationLevel","favoriteTopicIds","handle"].sort());
    } finally { await guest.close(); }
    check(errors,[],"no unhandled browser errors");
    console.log(`Community profile account-header browser: ${assertions} assertions passed.`);
  } else {
  await page.goto(`${origin}/dashboard`);await page.getByRole("heading",{name:"Set up your community profile"}).waitFor();
  await page.getByRole("button",{name:"Skip for now",exact:true}).click();await page.reload();
  check(await page.getByRole("heading",{name:"Set up your community profile"}).count(),0,"dismissal survives reload");
  check((await pool.query("SELECT count(*)::int n FROM community_profile")).rows[0].n,0,"skip creates no profile");
  await page.goto(`${origin}/settings?onboarding=1`);await page.getByLabel("Permanent username").waitFor();
  check(await page.getByLabel("Make my profile public").isChecked(),false);
  check(await page.getByLabel("Display name",{exact:true}).inputValue(),"PRIVATE_ACCOUNT_NAME","new profiles prefill the account name without publishing it");
  check((await pool.query("SELECT count(*)::int n FROM community_profile")).rows[0].n,0,"prefilling the owner preview creates no stored or public profile");
  await page.getByLabel("Display name",{exact:true}).fill("Nadir Physics");await page.getByLabel("Permanent username").fill("Nadir_Physics");
  await page.getByLabel("Biography",{exact:true}).fill("Exploring mechanics and light.");
  await page.getByLabel("Education level").selectOption("university");await page.getByLabel("Mechanics",{exact:true}).check();await page.getByLabel("Optics",{exact:true}).check();
  await page.getByRole("region",{name:"Profile"}).getByRole("button",{name:"Create profile"}).click();await waitText("Profile saved.");
  check(await page.getByLabel("Permanent username").inputValue(),"nadir_physics");check(await page.getByLabel("Permanent username").isEditable(),false);
  await page.reload();await page.getByLabel("Permanent username").waitFor();check(await page.getByLabel("Display name",{exact:true}).inputValue(),"Nadir Physics");
  await page.getByLabel("Display name",{exact:true}).fill("Nadir Updated");await page.getByLabel("Make my profile public").check();
  await page.getByRole("button",{name:"Save changes",exact:true}).click();await waitText("Profile saved.");
  const avatar = page.locator("#avatar-file");await avatar.waitFor();
  await avatar.setInputFiles({name:"photo.png",mimeType:"image/png",buffer:png});await page.getByRole("button",{name:"Save picture",exact:true}).click();await waitText("Profile image saved.");
  const firstId = (await context.request.get(`${origin}/api/community/profile-media`).then(r=>r.json())).media.avatar.id;
  await page.locator("#banner-file").setInputFiles({name:"banner.png",mimeType:"image/png",buffer:png});await page.getByRole("button",{name:"Save banner",exact:true}).click();await waitText("Profile image saved.");
  const guest = await browser.newContext({ viewport:{width:375,height:900} }), guestPage = await guest.newPage();
  await guestPage.goto(`${origin}/u/nadir_physics`);await guestPage.getByRole("heading",{name:"Nadir Updated",exact:true}).waitFor();
  check(await guestPage.getByText("PRIVATE_ACCOUNT_EMAIL@example.invalid").count(),0);
  check(await guestPage.getByText("PRIVATE_ACCOUNT_NAME",{exact:true}).count(),0,"private account name is absent from the public profile");
  check((await guest.request.get(`${origin}/api/community/profile-media/image/${firstId}`)).status(),200);
  await avatar.setInputFiles({name:"replace.jpg",mimeType:"image/jpeg",buffer:replacement});await page.getByRole("button",{name:"Save picture",exact:true}).click();await waitText("Profile image saved.");
  check((await guest.request.get(`${origin}/api/community/profile-media/image/${firstId}`)).status(),404,"old media IDs are revoked");
  const activeId = (await context.request.get(`${origin}/api/community/profile-media`).then(r=>r.json())).media.avatar.id;
  await page.getByLabel("Make my profile public").uncheck();await page.getByRole("button",{name:"Save changes",exact:true}).click();await waitText("Profile saved.");
  await guestPage.reload();await guestPage.getByRole("heading",{name:"Profile not found",exact:true}).waitFor();
  check((await guest.request.get(`${origin}/api/community/profile-media/image/${activeId}`)).status(),404,"private transition revokes guest image reads");
  check((await context.request.get(`${origin}/api/community/profile-media/image/${activeId}`)).status(),200,"owner preview remains authorized");
  await page.getByRole("button",{name:"Remove picture",exact:true}).click();await waitText("Profile image removed.");
  await page.getByRole("button",{name:"Remove banner",exact:true}).click();await waitText("Profile image removed.");
  check(objects.size,0,"replacement and removal clean up private objects");
  await resetLimits();failPut=true;
  await avatar.setInputFiles({name:"failure.png",mimeType:"image/png",buffer:png});await page.getByRole("button",{name:"Save picture",exact:true}).click();
  await page.getByRole("alert").filter({hasText:"This change could not be completed"}).waitFor();
  check(await page.getByLabel("Display name",{exact:true}).inputValue(),"Nadir Updated");check(await page.getByText("PRIVATE_STORAGE_SENTINEL").count(),0);failPut=false;
  await page.getByRole("button",{name:"Reload profile images",exact:true}).click();
  await page.getByRole("button",{name:"Cancel selection",exact:true}).click();
  const spoof = Buffer.from("<svg><script>window.evil=1</script></svg>");
  await avatar.setInputFiles({name:"spoof.png",mimeType:"image/png",buffer:spoof});
  await page.getByRole("alert").filter({hasText:"Choose a valid PNG, JPEG or WebP image"}).waitFor();
  check(await page.getByRole("button",{name:"Save picture",exact:true}).isDisabled(),true,"invalid image cannot be saved from the crop editor");
  check((await context.request.put(`${origin}/api/community/profile-media/avatar`,{headers:{"Content-Type":"image/png",Origin:origin},data:spoof})).status(),400,"server independently rejects a forged image");
  check(await page.evaluate(()=>window.evil),undefined);
  await page.getByRole("button",{name:"Cancel selection",exact:true}).click();
  await avatar.setInputFiles({name:"too-large.png",mimeType:"image/png",buffer:Buffer.alloc(2*1024*1024+1)});await page.getByText("Choose a nonempty image up to 2 MB.",{exact:true}).waitFor();
  await page.getByLabel("Display name",{exact:true}).fill("Still editable");await page.getByRole("button",{name:"Save changes",exact:true}).click();await waitText("Profile saved.");
  check((await pool.query("SELECT display_name FROM community_profile WHERE user_id='owner'")).rows[0].display_name,"Still editable","media failure never blocks profile editing");
  await page.goto(`${origin}/dashboard`);check(await page.getByRole("heading",{name:"Set up your community profile"}).count(),0,"completed setup stays quiet");
  await context.addCookies([{name:"test_user",value:"other",url:origin}]);await page.reload();await page.getByRole("heading",{name:"Set up your community profile"}).waitFor();
  await page.getByRole("link",{name:"Set up profile",exact:true}).click();await page.getByLabel("Permanent username").waitFor();
  await page.getByLabel("Permanent username").fill("nadir_physics");await page.getByRole("button",{name:"Create profile",exact:true}).click();await page.getByRole("alert").filter({hasText:"That username is unavailable"}).waitFor();
  check(await page.getByLabel("Permanent username").isEditable(),true);await page.getByLabel("Permanent username").fill("other_person");await page.getByRole("button",{name:"Create profile",exact:true}).click();await waitText("Profile saved.");
  check((await pool.query("SELECT user_id FROM community_profile WHERE handle='other_person'")).rows[0].user_id,"other");
  await context.addCookies([{name:"test_user",value:"owner",url:origin}]);await page.goto(`${origin}/settings`);await page.getByLabel("Permanent username").waitFor();
  for (const width of [1440,375]) {
    await page.setViewportSize({width,height:1000});
    for (const theme of ["Light","Dark"]) {
      await page.getByRole("radio",{name:theme,exact:true}).check();
      await page.waitForFunction(dark=>document.documentElement.classList.contains("dark")===dark,theme==="Dark");
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no overflow at ${width}/${theme}`);
      await page.screenshot({path:join(temp,`settings-${width}-${theme}.png`),fullPage:true});
      const violations = (await new AxeBuilder({page}).analyze()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary}))}));
      check(violations,[],`axe at ${width}/${theme}`);
    }
  }
  await page.getByRole("radio",{name:"Light",exact:true}).focus();await page.keyboard.press("ArrowRight");check(await page.getByRole("radio",{name:"Dark",exact:true}).isChecked(),true,"native radio keyboard controls");
  await page.getByRole("radio",{name:"System",exact:true}).check();await page.emulateMedia({colorScheme:"dark"});await page.waitForFunction(()=>document.documentElement.classList.contains("dark"));
  await page.reload();await page.getByRole("radio",{name:"System",exact:true}).waitFor();check(await page.getByRole("radio",{name:"System",exact:true}).isChecked(),true,"theme survives reload");
  failProfiles=true;await page.reload();await page.getByRole("alert").filter({hasText:"Your profile could not be loaded"}).waitFor();check(await page.getByRole("radio",{name:"Light",exact:true}).isEnabled(),true);
  check(await page.getByText("PRIVATE_DB_SENTINEL").count(),0);failProfiles=false;await page.getByRole("button",{name:"Retry profile",exact:true}).click();await page.getByLabel("Permanent username").waitFor();
  flags.media=false;await page.reload();await page.getByText("Profile images are not available yet. You can save profile details without images.",{exact:true}).waitFor();check(await page.getByLabel("Display name",{exact:true}).isEditable(),true);
  flags.profiles=false;const before=requests.length;await page.reload();await page.getByText(/Community profiles are not available yet/).waitFor();
  check(requests.slice(before).filter(r=>r.path.startsWith("/api/community/")).length,0,"disabled UI does not request profile or media tables");
  check(await page.getByRole("radio",{name:"Light",exact:true}).isEnabled(),true);
  flags.profiles=true;await context.addCookies([{name:"test_user",value:"unverified",url:origin}]);await page.reload();await page.getByLabel("Permanent username").waitFor();check(await page.getByRole("button",{name:"Save changes",exact:true}).isEnabled(),false);
  await guestPage.goto(`${origin}/settings`);await guestPage.getByRole("link",{name:"Sign in",exact:true}).waitFor();check(await guestPage.getByRole("radio",{name:"Light",exact:true}).isEnabled(),true);
  for (const body of bodies.filter(body=>!body.includes("PRIVATE_DB_SENTINEL"))) check(body.includes("PRIVATE_STORAGE_SENTINEL"),false);
  check(errors,[],"no unhandled browser errors");
  console.log(`Community profile browser: ${assertions} assertions passed, including PostgreSQL-backed save/reload, privacy/media lifecycle, onboarding, keyboard, light/dark, 375px and axe.`);
  console.log(`Screenshots: ${temp}`);
  }
} finally {
  await browser?.close();await new Promise(resolve=>server ? server.close(resolve) : resolve());
  await pool.end();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();
  // Keep screenshots in work/ for visual review; no user data, credentials or browser state.
}
