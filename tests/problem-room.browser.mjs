// Actual reader components, synthetic guest session and bounded local fixtures only.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const tools = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS || '/tmp/physcratic-editor-test','package.json'));
const { chromium } = tools('playwright');
const { default: AxeBuilder } = tools('@axe-core/playwright');
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const temp = await mkdtemp(join(tmpdir(),'physcratic-room-'));
let browser, server, origin, checks = 0;
const errors = [];
try {
  const output = await build({entryPoints:['tests/problem-room-harness.tsx'],outdir:temp,entryNames:'bundle',chunkNames:'lazy-[name]-[hash]',bundle:true,splitting:true,metafile:true,format:'esm',platform:'browser',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},logLevel:'silent'});
  const assets = new Set(Object.keys(output.metafile.outputs).map(p => '/'+basename(p)));
  execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',join(temp,'style.css')],{stdio:'pipe'});
  server = createServer(async(req,res) => {
    const url = new URL(req.url,origin);
    res.setHeader('Cache-Control','no-store');
    if (assets.has(url.pathname) || url.pathname === '/style.css') {
      res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':'application/javascript');
      res.end(await readFile(join(temp,basename(url.pathname)))); return;
    }
    res.setHeader('Content-Type','application/json');
    if (url.pathname.startsWith('/api/auth/')) { res.end('null');return; }
    if (url.pathname.startsWith('/corpus/grading/')) {
      res.end(JSON.stringify({problemId:basename(url.pathname,'.json'),version:'a'.repeat(64),parts:[{id:'a',sourcePart:'a',label:'Final answer',kind:'numeric',unit:'',symbols:[],symbolConditions:[],help:''}]}));return;
    }
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/corpus/')) {res.statusCode=503;res.end('{"error":"Synthetic unavailable source"}');return;}
    res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Problem room test</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
  browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  await mkdir('work',{recursive:true});
  for (const kind of ['practice','arena','imported']) for (const width of [375,1440]) for (const theme of ['light','dark']) {
    const context = await browser.newContext({viewport:{width,height:900}});
    await context.addInitScript(theme=>document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.toggle('dark',theme==='dark')),theme);
    const page = await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/?kind='+kind);await page.locator('[data-answer-workspace]').waitFor();
    assert.equal(await page.getByRole('heading',{level:1}).count(),1);checks++;
    assert.equal(await page.locator('main#solver-main').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;
    const rail = page.locator('[data-answer-workspace]');
    assert.equal(await rail.evaluate(el=>getComputedStyle(el).position),width===375?'static':'sticky');checks++;
    if(kind==='imported') {
      await page.getByRole('tab',{name:'Worked solution',exact:false}).click();
      assert.equal(await page.locator('[aria-label="Your solution"]').count(),1,'submission remains mounted beside document tabs');checks++;
    }
    await rail.focus();assert.equal(await rail.evaluate(el=>document.activeElement===el),true);checks++;
    const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);checks++;
    await page.screenshot({path:'work/room-'+kind+'-'+width+'-'+theme+'.png',fullPage:false});
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS '+checks+' shared room layout, keyboard and axe checks across three readers, two widths and two themes. Sessions and source failures are synthetic.');
} finally { await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true}); }
