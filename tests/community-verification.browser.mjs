// Local real components/API factories + disposable PostgreSQL. No deployed services.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdtemp, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { Pool } from "pg";
import { createMedalApi } from "../lib/community/medal-api.ts";
import { createCommunityProfileApi } from "../lib/community/profile-api.ts";
import { createCommunityAchievementsApi } from "../lib/community/achievements-api.ts";
import { createCommunityAchievementsRoute } from "../lib/community/achievements-route.ts";
import { achievementFixtures, installAchievementFixtures } from "./community-achievement-fixtures.ts";
const require = createRequire(import.meta.url), tooling = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"));
const { chromium } = tooling("playwright"), { default: AxeBuilder } = tooling("@axe-core/playwright");
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const target = new URL(process.env.AUTHORING_TEST_DATABASE_URL || "http://invalid");
assert.equal(target.hostname,"127.0.0.1"); assert.equal(target.pathname,"/physcratic_authoring_test");
const schema = `medal_ui_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString:target.href }), pool = new Pool({ connectionString:target.href, options:`-c search_path=${schema},public`,max:5 });
await mkdir("work",{recursive:true}); const temp=await mkdtemp(join(process.cwd(),"work/medal-browser-"));
let server,browser,origin,fail=false;const flags={profiles:true,media:false,achievements:true,verification:true},requests=[];
const deps={pool,user:async r=>r.headers.get("x-test-user")?{id:r.headers.get("x-test-user"),emailVerified:true}:null,origin:r=>r.headers.get("origin")===origin};
const profiles=createCommunityProfileApi(deps),achievements=createCommunityAchievementsApi({...deps,medalsEnabled:()=>true});
const objects=new Map();
const medals=createMedalApi({...deps,storage:{put:async(p,b)=>{objects.set(p,b);},get:async p=>objects.has(p)?new ReadableStream({start(c){c.enqueue(objects.get(p));c.close();}}):null,del:async p=>{objects.delete(p);}}});
const route=createCommunityAchievementsRoute(()=>flags.profiles&&flags.achievements,async()=>({communityAchievementsApi:achievements}));
let assertions=0; const check=(actual,expected,note)=>{assert.deepEqual(actual,expected,note);assertions++;};
try {
  await admin.query(`CREATE SCHEMA ${schema}`);await installAchievementFixtures(pool);
  for(const name of ['0010_community_medals','0011_community_medal_showcase'])await pool.query('BEGIN;'+await readFile('migrations/'+name+'.up.sql','utf8')+'COMMIT;');
  const f=achievementFixtures(pool); await f.user("owner");await f.user("other");await f.user("admin");
  await pool.query("INSERT INTO community_staff(user_id,role,reason) VALUES('admin','admin','synthetic browser review')");
  for(let i=0;i<51;i++){const id=randomUUID();await pool.query("INSERT INTO community_medal_claim(id,user_id,competition,award,year,country,competition_name,certificate_name,pathname,bytes,sha256) VALUES($1,'other','National','gold',2025,'ID',$4,'Queue fixture',$2,1,$3)",[id,`community-medal-proof/${id}.pdf`,'a'.repeat(64),id]);await pool.query("UPDATE community_medal_claim SET state='pending',version=2 WHERE id=$1",[id]);}

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
    const identity=req.headers.cookie?.match(/test_user=(owner|admin|other)/)?.[1];
    const owner=Boolean(identity);
    if(url.pathname==="/api/auth/get-session"){
      const date=new Date().toISOString(),user={id:identity,name:"PRIVATE_ACCOUNT_NAME",email:"private@example.invalid",emailVerified:true,createdAt:date,updatedAt:date};
      res.setHeader("Content-Type","application/json");res.end(JSON.stringify(owner?{user,session:{id:"synthetic",token:"synthetic",userId:identity,createdAt:date,updatedAt:date,expiresAt:new Date(Date.now()+86400000).toISOString()}}:null));return;
    }
    if(url.pathname.startsWith("/api/community/")){
      requests.push(url.pathname);const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const headers=new Headers(Object.entries(req.headers).filter(([,v])=>typeof v==="string"));if(owner)headers.set("x-test-user",identity);
      const request=new Request(url,{method:req.method,headers,body:req.method==="GET"?undefined:new Uint8Array(Buffer.concat(chunks))});
      let response;
      if(url.pathname.startsWith('/api/community/medals')){const pieces=url.pathname.split('/');const action=pieces.length===5&&pieces[4]==='review'?'queue':pieces.length===6?(pieces[5]==='proof'?'proof':req.method==='GET'?'detail':'review'):req.method==='POST'?'submit':'own';response=await medals(action,request,pieces[4]);}
      else response=url.pathname==="/api/community/achievements"?(fail?Response.json({error:"PRIVATE_ERROR"},{status:503}):await route(request)):await profiles(url.pathname==="/api/community/profile"?"own":"public",request,url.pathname.split("/").at(-1));
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(new Uint8Array(await response.arrayBuffer()));return;
    }
    res.setHeader("Content-Type","text/html");res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Achievement test</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script>window.__COMMUNITY_TEST_FLAGS__=${JSON.stringify(flags)}</script><script src="/bundle.js"></script></body></html>`);
  }catch(e){console.error(e);res.writeHead(500);res.end("Harness failure");}});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"});await context.addCookies([{name:"test_user",value:"owner",url:origin}]);
  const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  function validPdf(){let s='%PDF-1.4\n';const offsets=[];for(const [i,body]of ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>'].entries()){offsets.push(s.length);s+=`${i+1} 0 obj\n${body}\nendobj\n`;}const x=s.length;return Buffer.from(s+'xref\n0 4\n0000000000 65535 f \n'+offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`);}
  const as=async who=>{await context.clearCookies();if(who)await context.addCookies([{name:'test_user',value:who,url:origin}]);};
  await page.goto(`${origin}/settings`);const verification=page.locator('#verification-settings');await verification.getByRole('heading',{name:'Your claim history'}).waitFor();
  await verification.getByLabel('Full name on certificate').fill('李 PRIVATE_CERTIFICATE');await verification.getByLabel('Award',{exact:true}).selectOption('honourable-mention');await verification.getByLabel('Year',{exact:true}).fill('2025');await verification.getByLabel('Private PDF proof').setInputFiles({name:'certificate.pdf',mimeType:'application/pdf',buffer:validPdf()});await verification.getByRole('button',{name:'Submit certificate'}).click();await page.getByText('Claim submitted for review.',{exact:false}).waitFor();
  const claim=(await pool.query("SELECT id,certificate_name FROM community_medal_claim WHERE user_id='owner'")).rows[0];check(claim.certificate_name,'李 PRIVATE_CERTIFICATE','Unicode metadata');
  await as('admin');await page.goto(`${origin}/admin/verification`);await page.getByRole('button',{name:'Next page'}).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Next page')?.disabled===false);await page.getByRole('button',{name:'Next page'}).click();await page.waitForFunction(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Previous page')?.disabled===false);check(await page.getByRole('button',{name:'Previous page'}).isEnabled(),true,'pagination');
  await page.getByLabel('Open claim by ID').fill(claim.id);await page.getByRole('button',{name:'Open claim',exact:true}).click();await page.getByRole('button',{name:'Download private certificate'}).waitFor();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download private certificate'}).click();check((await downloadPromise).suggestedFilename(),'medal-proof.pdf','private attachment');
  const exportDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export this page as CSV'}).click();const csv=await readFile(await(await exportDownload).path(),'utf8');check(csv.includes('PRIVATE_CERTIFICATE'),false,'CSV omits certificate names');
  await page.getByLabel('Reason (required)').fill('Please clarify the certificate date.');await page.getByRole('button',{name:'Request more information'}).click();await page.getByText('more-info · version 3').waitFor();
  await page.getByLabel('Reason (required)').fill('Verified the certificate.');await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByText('Decision recorded in the audit history.').waitFor();check(await page.getByText('approved · version 4').count(),1,'audit');
  for(const width of [1440,375]){await page.setViewportSize({width,height:1000});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'dashboard wraps');check((await new AxeBuilder({page}).analyze()).violations,[],'dashboard axe');}await page.screenshot({path:join(temp,'admin-mobile.png'),fullPage:true});
  await as('owner');await page.goto(`${origin}/settings`);const showcase=page.locator('#achievement-settings');await showcase.getByLabel('Show IPhO honourable-mention 2025').waitFor();await showcase.getByLabel('Show First Spark',{exact:true}).check();await showcase.getByLabel('Show IPhO honourable-mention 2025').check();check(await showcase.getByLabel('Show Problem Weaver',{exact:true}).isDisabled(),true,'shared two slots');await showcase.getByRole('button',{name:'Swap badge order'}).click();await showcase.getByRole('button',{name:'Save showcase',exact:true}).click();await page.getByText('Achievement showcase saved.').waitFor();await page.reload();await showcase.getByLabel('Show IPhO honourable-mention 2025').waitFor();check(await showcase.getByLabel('Show IPhO honourable-mention 2025').isChecked(),true,'saved medal');
  await page.getByLabel('Dark',{exact:true}).check();await page.waitForTimeout(250);check((await new AxeBuilder({page}).analyze()).violations,[],'settings dark mobile axe');await verification.screenshot({path:join(temp,'settings-mobile.png')});
  await as(null);await page.goto(`${origin}/u/${handle}`);await page.getByLabel('Achievement showcase').waitFor();check(await page.getByLabel('Achievement showcase').locator('summary').allTextContents(),['IPhO · Honourable Mention · 2025','First Spark'],'accurate ordered medal');check((await page.textContent('body')).includes('PRIVATE_CERTIFICATE'),false,'certificate name private');const summary=page.getByLabel('IPhO · Honourable Mention · 2025: medal details');await summary.focus();await page.keyboard.press('Enter');check(await summary.locator('..').getAttribute('open'),'','keyboard medal details');check((await new AxeBuilder({page}).analyze()).violations,[],'public mobile axe');await page.screenshot({path:join(temp,'public-mobile.png'),fullPage:true});
  await pool.query('TRUNCATE community_medal_limit');await as('admin');await page.goto(`${origin}/admin/verification`);await page.getByLabel('Open claim by ID').fill(claim.id);await page.getByRole('button',{name:'Open claim',exact:true}).click();await page.getByRole('button',{name:'Revoke approval'}).waitFor();await page.getByLabel('Reason (required)').fill('Evidence withdrawn.');await page.getByRole('button',{name:'Revoke approval'}).click();await page.getByText('revoked · version 5').waitFor();
  await as(null);await page.goto(`${origin}/u/${handle}`);await page.getByLabel('Achievement showcase').waitFor();check(await page.getByLabel('Achievement showcase').locator('summary').allTextContents(),['First Spark'],'live revocation');
  await pool.query("UPDATE community_profile SET public_visibility=false WHERE user_id='owner'");await page.reload();await page.getByRole('heading',{name:'Profile not found'}).waitFor();
  await as('owner');await page.goto(`${origin}/admin/verification`);await page.getByRole('alert').waitFor();check(await page.getByText('Queue fixture',{exact:true}).count(),0,'non-admin denied');
  check(errors,[],'no browser errors');console.log(JSON.stringify({assertions,artifacts:temp}));
}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
