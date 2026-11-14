// Real native reader, MathLive and stateless checker. Auth is a browser-only synthetic adapter.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { olympiadDefinitions } from '../lib/olympiad/keys.ts';
import { handleArchiveGrade } from '../lib/archive-grading-request.ts';
import { importedProblemSchema } from '../lib/imported-corpus-schema.ts';
const require = createRequire(import.meta.url);
const tools = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS || '/tmp/physcratic-editor-test','package.json'));
const { chromium } = tools('playwright');
const { default: AxeBuilder } = tools('@axe-core/playwright');
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const index = JSON.parse(await readFile('lib/corpus/import-index.json','utf8'));
const records = new Map(await Promise.all(olympiadDefinitions.map(async d => [d.problemId,importedProblemSchema.parse(JSON.parse(await readFile('public'+index.problems.find(p=>p.id===d.problemId).path,'utf8')))])));
const temp = await mkdtemp(join(tmpdir(),'physcratic-native-'));
let browser,server,origin,checks=0,statelessPosts=0,persistentPosts=0;
const errors=[];
try {
  const built=await build({entryPoints:['tests/native-olympiad-harness.tsx'],outdir:temp,entryNames:'bundle',chunkNames:'lazy-[name]-[hash]',bundle:true,splitting:true,metafile:true,format:'esm',platform:'browser',jsx:'automatic',alias:{'@':process.cwd(),'@/lib/auth-client':resolve('tests/practice-session-fixture.ts')},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},logLevel:'silent'});
  const assets=new Set(Object.keys(built.metafile.outputs).map(p=>'/'+basename(p)));
  execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',join(temp,'style.css')],{stdio:'pipe'});
  server=createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,origin);
      res.setHeader('Cache-Control','no-store');
      if(assets.has(url.pathname)||url.pathname==='/style.css'){
        res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':'application/javascript');
        res.end(await readFile(join(temp,basename(url.pathname))));return;
      }
      if(url.pathname.startsWith('/corpus/')&&!url.pathname.includes('..')){
        res.setHeader('Content-Type',url.pathname.endsWith('.png')?'image/png':url.pathname.endsWith('.pdf')?'application/pdf':'application/json');
        res.end(await readFile('public'+url.pathname));return;
      }
      if(url.pathname==='/api/archive-grade'){
        statelessPosts++;const chunks=[];for await(const c of req)chunks.push(c);
        const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
        const response=await handleArchiveGrade(new Request(url,{method:'POST',headers,body:Buffer.concat(chunks)}),[origin]);
        res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
      }
      if(url.pathname.startsWith('/api/')){
        if(req.method==='POST')persistentPosts++;
        res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"Synthetic provider unavailable"}');return;
      }
      const record=records.get(url.searchParams.get('id'));if(!record){res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Native olympiad test</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script>window.__nativeRecord='+JSON.stringify(record).replaceAll('<','\\u003c')+'</script><script type="module" src="/bundle.js"></script></body></html>');
    }catch(e){res.writeHead(500);res.end(String(e));}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  await mkdir('work',{recursive:true});
  for(const definition of olympiadDefinitions)for(const width of [375,1440])for(const theme of ['light','dark']){
    const context=await browser.newContext({viewport:{width,height:1000}});
    await context.addInitScript(theme=>document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.toggle('dark',theme==='dark')),theme);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/?id='+definition.problemId);
    await page.getByRole('button',{name:'Check answer',exact:true}).waitFor();
    await page.evaluate(()=>window.__setPracticeSession('Synthetic',true));
    await page.getByRole('button',{name:'Check answer',exact:true}).waitFor();
    assert.equal(await page.locator('iframe,embed,object').count(),0);checks++;
    assert.equal(await page.getByRole('heading',{level:1}).count(),1);checks++;
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;
    for(const part of definition.parts){
      if(part.kind==='self-review')await page.getByLabel('Your reasoning for '+part.sourcePart,{exact:true}).fill('My reasoning stays separate from automatic checking.');
      else if(part.kind==='numeric')await page.locator('input[inputmode="decimal"]').fill(String(part.target));
      else{
        const field=page.locator('math-field').filter({visible:true}).nth(definition.parts.filter(p=>p.kind==='expression').indexOf(part));
        await field.waitFor();await field.evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},part.canonical);
      }
    }
    await page.getByRole('tab',{name:/Worked solution/}).click();
    assert.equal(await page.locator('math-field').count(),definition.parts.filter(p=>p.kind==='expression').length);checks++;
    await page.getByRole('tab',{name:/Problem statement/}).click();
    await page.getByRole('button',{name:'Check answer',exact:true}).click();
    await page.getByText('Checked without saving. This result does not update account progress.',{exact:true}).waitFor();checks++;
    const feedback=await page.locator('[id$="-result"]').allTextContents();
    assert.ok(feedback.length>=definition.parts.filter(p=>p.kind!=='self-review').length);checks++;
    assert.ok(feedback.every(t=>t.startsWith('Correct.')),feedback.join('\n'));checks++;
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);checks++;
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'work/native-'+definition.problemId+'-'+width+'-'+theme+'.png'});
    await context.close();
  }
  assert.equal(persistentPosts,0,'signed-in native checks must not reach a persistence/provider endpoint');checks++;
  assert.equal(statelessPosts,20);assert.deepEqual(errors,[]);
  console.log('PASS '+checks+' native reader, stateless grading, keyboard/axe and account-isolation checks in 20 width/theme/problem combinations.');
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
