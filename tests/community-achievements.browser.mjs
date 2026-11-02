// Local real components/API factories + disposable PostgreSQL. No deployed services.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdtemp, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { Pool } from "pg";
import { createCommunityProfileApi } from "../lib/community/profile-api.ts";
import { createCommunityAchievementsApi } from "../lib/community/achievements-api.ts";
import { createCommunityAchievementsRoute } from "../lib/community/achievements-route.ts";
import { achievementFixtures, installAchievementFixtures } from "./community-achievement-fixtures.ts";
const require = createRequire(import.meta.url), tooling = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"));
const { chromium } = tooling("playwright"), { default: AxeBuilder } = tooling("@axe-core/playwright");
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const target = new URL(process.env.AUTHORING_TEST_DATABASE_URL || "http://invalid");
assert.equal(target.hostname,"127.0.0.1"); assert.equal(target.pathname,"/physcratic_authoring_test");
const schema = `achievement_browser_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString:target.href }), pool = new Pool({ connectionString:target.href, options:`-c search_path=${schema},public`,max:5 });
await mkdir("work",{recursive:true}); const temp=await mkdtemp(join(process.cwd(),"work/achievement-browser-"));
let server,browser,origin,fail=false;const flags={profiles:true,media:false,achievements:true},requests=[];
const deps={pool,user:async r=>r.headers.get("x-test-user")==="owner"?{id:"owner",emailVerified:true}:null,origin:r=>r.headers.get("origin")===origin};
const profiles=createCommunityProfileApi(deps),achievements=createCommunityAchievementsApi(deps);
const route=createCommunityAchievementsRoute(()=>flags.profiles&&flags.achievements,async()=>({communityAchievementsApi:achievements}));
let assertions=0; const check=(actual,expected,note)=>{assert.deepEqual(actual,expected,note);assertions++;};
try {
  await admin.query(`CREATE SCHEMA ${schema}`);await installAchievementFixtures(pool);
  const f=achievementFixtures(pool); await f.user("owner");await f.user("other");
  for(let i=0;i<5;i++) await f.problem("owner");
  const solved=await f.problem("other");check((await f.submit(solved,"owner")).status,201);
  const handle=(await pool.query("SELECT handle FROM community_profile WHERE user_id='owner'")).rows[0].handle;
  await build({entryPoints:["tests/community-profile-harness.tsx"],outfile:join(temp,"bundle.js"),bundle:true,platform:"browser",jsx:"automatic",alias:{"@":process.cwd()},define:{"process.env.NODE_ENV":'"development"',"process.env":"{}"},logLevel:"silent"});
  execFileSync("node_modules/.bin/tailwindcss",["-i","app/globals.css","-o",join(temp,"style.css")],{stdio:"pipe"});
  const bundle=await readFile(join(temp,"bundle.js"),"utf8");
  for(const secret of ["community_achievement_progress","createCommunityAchievementsApi","authored_attempt"])check(bundle.includes(secret),false,"server eligibility stays out of browser");
  server=createServer(async(req,res)=>{try{
    const url=new URL(req.url,origin);
    if(["/bundle.js","/style.css"].includes(url.pathname)){res.setHeader("Content-Type",url.pathname.endsWith("js")?"application/javascript":"text/css");res.end(await readFile(join(temp,url.pathname.slice(1))));return;}
    const owner=req.headers.cookie?.includes("test_user=owner");
    if(url.pathname==="/api/auth/get-session"){
      const date=new Date().toISOString(),user={id:"owner",name:"PRIVATE_ACCOUNT_NAME",email:"private@example.invalid",emailVerified:true,createdAt:date,updatedAt:date};
      res.setHeader("Content-Type","application/json");res.end(JSON.stringify(owner?{user,session:{id:"synthetic",token:"synthetic",userId:"owner",createdAt:date,updatedAt:date,expiresAt:new Date(Date.now()+86400000).toISOString()}}:null));return;
    }
    if(url.pathname.startsWith("/api/community/")){
      requests.push(url.pathname);const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const headers=new Headers(Object.entries(req.headers).filter(([,v])=>typeof v==="string"));if(owner)headers.set("x-test-user","owner");
      const request=new Request(url,{method:req.method,headers,body:req.method==="GET"?undefined:new Uint8Array(Buffer.concat(chunks))});
      const response=url.pathname==="/api/community/achievements"?(fail?Response.json({error:"PRIVATE_ERROR"},{status:503}):await route(request)):await profiles(url.pathname==="/api/community/profile"?"own":"public",request,url.pathname.split("/").at(-1));
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(new Uint8Array(await response.arrayBuffer()));return;
    }
    res.setHeader("Content-Type","text/html");res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Achievement test</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script>window.__COMMUNITY_TEST_FLAGS__=${JSON.stringify(flags)}</script><script src="/bundle.js"></script></body></html>`);
  }catch(e){console.error(e);res.writeHead(500);res.end("Harness failure");}});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"});await context.addCookies([{name:"test_user",value:"owner",url:origin}]);
  const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(`${origin}/settings`);await page.getByText("Earned · 5/5",{exact:true}).waitFor();
  const section=page.locator("#achievement-settings");
  check(await section.getByLabel("Show Equation Architect").isDisabled(),true,"locked");
  await section.getByLabel("Show First Spark",{exact:true}).check();await section.getByLabel("Show Problem Weaver",{exact:true}).check();
  check(await section.getByLabel("Show First Breakthrough",{exact:true}).isDisabled(),true,"max two");
  await section.getByRole("button",{name:"Swap badge order"}).click();await section.getByRole("button",{name:"Save showcase",exact:true}).click();await page.getByText("Achievement showcase saved.").waitFor();
  await page.reload();await section.getByLabel("Show First Spark",{exact:true}).waitFor();
  check(await section.getByLabel("Show First Spark",{exact:true}).isChecked(),true,"persisted");
  const saved=(await pool.query("SELECT badge_ids FROM community_badge_selection WHERE user_id='owner'")).rows[0].badge_ids;check(saved,["problem-weaver","first-spark"],"order");
  const summary=section.getByLabel("First Spark: badge details").first();await summary.focus();await page.keyboard.press("Enter");check(await summary.locator("..").getAttribute("open"),"","keyboard disclosure");await page.keyboard.press("Enter");
  check(await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches),true,"reduced motion");
  for(const theme of ["light","dark"]){await page.evaluate(theme=>document.documentElement.className=theme,theme);await page.waitForTimeout(250);check((await new AxeBuilder({page}).analyze()).violations,[],`${theme} desktop axe`);}
  await page.setViewportSize({width:375,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"mobile no overflow");
  check((await new AxeBuilder({page}).analyze()).violations,[],"mobile axe");await section.screenshot({path:join(temp,"settings-mobile.png")});
  await context.clearCookies();await page.goto(`${origin}/u/${handle}`);await page.getByLabel("Achievement showcase").waitFor();
  check(await page.getByLabel("Achievement showcase").locator("summary").allTextContents(),["Problem Weaver","First Spark"],"public showcase");
  check((await new AxeBuilder({page}).analyze()).violations,[],"public axe");await page.screenshot({path:join(temp,"profile-mobile.png"),fullPage:true});
  await pool.query("UPDATE authored_problem SET state='archived',published_revision_id=NULL WHERE owner_id='owner'");await page.reload();await page.getByRole("article",{name:"Public profile"}).waitFor();check(await page.getByLabel("Achievement showcase").count(),0,"live eligibility revocation");
  await pool.query("UPDATE community_profile SET public_visibility=false WHERE user_id='owner'");await page.reload();await page.getByRole("heading",{name:"Profile not found"}).waitFor();
  await context.addCookies([{name:"test_user",value:"owner",url:origin}]);fail=true;await page.goto(`${origin}/settings`);await page.getByText("Achievements could not be loaded.",{exact:false}).waitFor();check(await page.getByText("PRIVATE_ERROR").count(),0,"generic error");
  fail=false;await page.getByRole("button",{name:"Reload achievements"}).click();await page.getByText("Locked · 0/1",{exact:true}).waitFor();
  flags.achievements=false;requests.length=0;await page.reload();await page.getByRole("heading",{name:"Appearance",exact:true}).waitFor();check(await page.getByRole("heading",{name:"Achievements",exact:true}).count(),0,"off UI");check(requests.includes("/api/community/achievements"),false,"off no query");
  check(errors,[],"no browser errors");console.log(JSON.stringify({assertions,artifacts:temp}));
}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
