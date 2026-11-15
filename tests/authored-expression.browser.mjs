// Actual StudentWorkspace/MathLive with synthetic published data and viewer. No live services.
// Node 22: AUTHORING_BROWSER_TOOLS=/external/tools CHROMIUM_PATH=/usr/bin/chromium
// node --conditions=react-server --import tsx tests/authored-expression.browser.mjs
// Existing authored-student.browser.mjs separately covers production APIs on disposable PostgreSQL.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { studentSubmissionSchema } from '../lib/authored-attempt-contracts.ts';
import { evaluateExpressionAnswer } from '../lib/authored-symbolic-grading.ts';
import { cleanLatex } from '../components/physics/answer-palette.ts';
const require = createRequire(import.meta.url);
const browserTools = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS || '/tmp/physcratic-editor-test', 'package.json'));
const { chromium } = browserTools('playwright');
const { default: AxeBuilder } = browserTools('@axe-core/playwright');
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const temp = await mkdtemp(join(tmpdir(), 'physcratic-b1-'));
const problemId = randomUUID(), revisionId = randomUUID();
const parts = ['numeric', 'expression', 'manual'].map((answerMode, i) => ({id:randomUUID(), label:String.fromCharCode(65+i), answerMode, blocks:[]}));
const revision = { id:revisionId, problemId, number:1, schemaVersion:1, publishedAt:new Date().toISOString(), content:{ title:'Harmonic Trap', topicTags:[], methodTags:[], estimatedDifficulty:null, context:[], sections:[{id:randomUUID(), title:'Motion', blocks:[], parts}], attachments:[], provenance:{kind:'original', source:'', rightsDeclaration:'Synthetic test content'} } };
const info = { problemId, revisionId, parts:parts.map(p=>({partId:p.id, answerMode:p.answerMode, symbols:p.answerMode==='expression'?['x']:[], attemptsUsed:'0', attemptsRemaining:null})), limits:{requestsPerMinute:60, submissionsPerMinute:20, attemptsPerDay:100, attemptsPerPart:null, spoilerPolicy:'no-reveal-v1', reveal:'disabled'} };
const key = { kind:'expression', expected:'x^2', variables:[{name:'x',domain:'real',assumptions:[]}], angleUnit:'radians', exclusions:[] };
let browser, server, origin;
const posts = [];
const errors = [];
let checks = 0;
const expressionOfLength = n => 'x+'.repeat(Math.floor((n-1)/2)) + (n%2 ? 'x' : '10');
const recoveredExpression = () => {
  const raw = sessionStorage.getItem(`physcratic:solve:v1:A:${window.__student.problemId}`);
  const book = JSON.parse(raw);
  return Object.values(book.buffers).find(b=>b.kind==='expression')?.expression;
};
async function writeMath(page, value) {
  const field = page.locator('math-field');
  await field.waitFor();
  await field.evaluate((el, text)=>{el.value=text;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
}
async function open(context) {
  const page = await context.newPage();
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto(origin);
  await page.getByLabel('Choose part',{exact:true}).selectOption({index:1});
  return page;
}
try {
  const output = await build({entryPoints:['tests/authored-student-harness.tsx'],outdir:temp,entryNames:'bundle',chunkNames:'lazy-[name]-[hash]',bundle:true,splitting:true,metafile:true,format:'esm',platform:'browser',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},logLevel:'silent'});
  const mathOutput = Object.entries(output.metafile.outputs).find(([,v])=>v.entryPoint?.includes('mathlive'));
  assert.ok(mathOutput, 'MathLive must remain a separate lazy import for delay/failure coverage');
  const mathPath = '/'+basename(mathOutput[0]);
  const assets = new Set(Object.keys(output.metafile.outputs).map(p=>'/'+basename(p)));
  execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',join(temp,'style.css')],{stdio:'pipe'});
  server = createServer(async(req,res)=>{
    try {
      const path = new URL(req.url,origin).pathname;
      res.setHeader('Cache-Control','no-store');
      if (assets.has(path) || path==='/style.css') {
        res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'application/javascript');
        res.end(await readFile(join(temp,basename(path)))); return;
      }
      if (path.startsWith('/api/')) {
        res.setHeader('Content-Type','application/json');
        if (req.method==='POST') {
          let raw='';for await(const c of req)raw+=c;
          posts.push(JSON.parse(raw));
          const body=studentSubmissionSchema.parse(posts.at(-1));
          const outcome=evaluateExpressionAnswer(body.answer,key);
          const attempt={id:randomUUID(),problemId,revisionId:body.revisionId,partId:body.partId,answer:body.answer,...outcome,engineVersion:'symbolic-v1',attemptNumber:String(posts.length),createdAt:new Date().toISOString(),spoilerPolicy:'no-reveal-v1',assisted:false};
          res.statusCode=201;res.end(JSON.stringify({attempt,replayed:false}));return;
        }
        res.end(JSON.stringify(path.endsWith('/submission-info')?info:path.includes('/attempts')?{attempts:[],nextCursor:null}:revision));return;
      }
      res.setHeader('Content-Type','text/html');
      res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Expression recovery test</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script>window.__student=${JSON.stringify({problemId,viewer:{state:'verified',id:'A'}})}</script><script type="module" src="/bundle.js"></script></body></html>`);
    } catch(e) {res.statusCode=400;res.end(JSON.stringify({error:String(e)}));}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  for (const mobile of [false,true]) for (const theme of ['light','dark']) {
    const context=await browser.newContext({viewport:{width:mobile?375:1440,height:900},isMobile:mobile,hasTouch:mobile});
    await context.addInitScript(theme=>document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.toggle('dark',theme==='dark')),theme);
    const page=await open(context);
    await page.locator('math-field').waitFor();
    assert.equal(await page.locator('math-field').evaluate(el=>el.value),'');checks++;
    for (const length of [179,180,181,210]) {
      const text=expressionOfLength(length);
      await writeMath(page,text);
      assert.equal(await page.evaluate(recoveredExpression),text);
      if(length>180) {
        await page.getByRole('status').filter({hasText:`This expression uses ${length} characters`}).waitFor();
        assert.equal(await page.locator('math-field').getAttribute('aria-invalid'),'true');
        const before=posts.length;
        await page.getByRole('button',{name:'Submit answer',exact:true}).click();
        assert.equal(posts.length,before);
        const books=await page.evaluate(()=>Object.values(sessionStorage).map(JSON.parse));
        assert.ok(books.every(b=>b.pending===null));
      }
      await page.reload();await page.getByLabel('Choose part',{exact:true}).selectOption({index:1});
      await page.locator('math-field').waitFor();
      assert.equal(await page.locator('math-field').evaluate(el=>el.value),text);
      assert.equal(await page.evaluate(recoveredExpression),text);checks++;
    }
    const invalidAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    assert.deepEqual(invalidAxe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);checks++;
    await page.getByLabel('Choose part',{exact:true}).selectOption({index:0});
    await page.getByLabel('Numerical answer',{exact:true}).fill('1.2e3');
    assert.equal(await page.locator('math-field').count(),0);
    await page.getByLabel('Choose part',{exact:true}).selectOption({index:2});
    await page.getByLabel('Manual answer',{exact:true}).fill('Reasoning with x^2');
    assert.equal(await page.locator('math-field').count(),0);
    await page.getByLabel('Choose part',{exact:true}).selectOption({index:1});await page.locator('math-field').waitFor();
    assert.equal(await page.locator('math-field').evaluate(el=>el.value),expressionOfLength(210));checks++;
    await page.evaluate(()=>window.__setViewer({state:'verified',id:'B'}));
    await page.getByLabel('Choose part',{exact:true}).selectOption({index:1});await page.locator('math-field').waitFor();
    assert.equal(await page.locator('math-field').evaluate(el=>el.value),'');
    await page.evaluate(()=>window.__setViewer({state:'verified',id:'A'}));
    await page.getByLabel('Choose part',{exact:true}).selectOption({index:1});await page.locator('math-field').waitFor();
    assert.equal(await page.locator('math-field').evaluate(el=>el.value),expressionOfLength(210));checks++;
    await writeMath(page,'');await page.locator('math-field').click();
    if(mobile) await page.keyboard.insertText('x');else await page.keyboard.type('x');
    await page.keyboard.type('^2');await page.keyboard.press('Tab');
    await page.getByRole('button',{name:'Submit answer',exact:true}).click();
    await page.getByRole('heading',{name:/Correct · saved attempt/}).waitFor();checks++;
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);checks++;
    await context.close();
  }
  // A delayed import keeps a stable loading state. There is no transient text editor to begin typing into.
  for (const mobile of [false,true]) {
    const context=await browser.newContext({viewport:{width:mobile?375:1440,height:900},isMobile:mobile,hasTouch:mobile});
    let release;const gate=new Promise(r=>release=r);
    await context.route('**'+mathPath,async route=>{await gate;await route.continue();});
    const page=await open(context);
    await page.getByRole('status').filter({hasText:'Loading math editor…'}).waitFor();
    assert.equal(await page.getByLabel('Expression answer',{exact:true}).count(),0);checks++;
    release();await page.locator('math-field').waitFor();
    await writeMath(page,'x*x');
    await page.getByRole('button',{name:'Submit answer',exact:true}).click();
    await page.getByRole('heading',{name:/Correct · saved attempt/}).waitFor();checks++;
    await context.close();
  }
  // P0's physical-keystroke stress case must not leave MathLive ahead of recovery.
  {
    const context=await browser.newContext();const page=await open(context);
    await page.locator('math-field').waitFor();await page.locator('math-field').click();
    await page.keyboard.type('x'.repeat(70));
    const visible=cleanLatex(await page.locator('math-field').evaluate(el=>el.value));
    assert.ok(visible.length>180);
    assert.equal(await page.evaluate(recoveredExpression),visible);
    await page.reload();await page.getByLabel('Choose part',{exact:true}).selectOption({index:1});
    await page.locator('math-field').waitFor();
    assert.equal(cleanLatex(await page.locator('math-field').evaluate(el=>el.value)),visible);checks++;
    await context.close();
  }
  // Failed imports retain the editable accessible fallback and the full draft.
  const context=await browser.newContext();await context.route('**'+mathPath,route=>route.abort());
  const page=await open(context);const plain=page.getByLabel('Expression answer',{exact:true});
  const beforeFallbackSubmit = posts.length;
  await plain.fill('x*x');
  await page.getByRole('button',{name:'Submit answer',exact:true}).click();
  await page.getByRole('heading',{name:/Correct · saved attempt/}).waitFor();
  assert.equal(posts.length,beforeFallbackSubmit+1);
  assert.equal(posts.at(-1).answer.expression,'x*x');checks++;
  await page.getByRole('button',{name:'Start another attempt',exact:true}).click();
  await plain.fill(expressionOfLength(210));await plain.blur();await page.reload();
  await page.getByLabel('Choose part',{exact:true}).selectOption({index:1});
  assert.equal(await page.getByLabel('Expression answer',{exact:true}).inputValue(),expressionOfLength(210));checks++;
  await context.unroute('**'+mathPath);
  await page.getByRole('button',{name:'Reload math editor',exact:true}).click();
  await page.getByLabel('Choose part',{exact:true}).selectOption({index:1});
  await page.locator('math-field').waitFor();
  assert.equal(cleanLatex(await page.locator('math-field').evaluate(el=>el.value)),expressionOfLength(210));checks++;
  await context.close();
  assert.deepEqual(errors,[],'no uncaught input, recovery or transition errors');
  console.log(`PASS ${checks} expression recovery/browser checks, desktop/touch and light/dark. Physical OS keyboard behavior is not established.`);
} finally {
  await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});
}
