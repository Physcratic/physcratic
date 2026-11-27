// Real owner-list UI, synthetic sessions and transport. PostgreSQL/API behavior is tested separately in core CI.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const require = createRequire(import.meta.url), external = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS || '/tmp/physcratic-editor-test', 'package.json'));
const { chromium } = external('playwright'), { default: AxeBuilder } = external('@axe-core/playwright');
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const arena = JSON.parse(await readFile('lib/arena/index.json', 'utf8')).problems;
const item = (i, title) => ({ key: `arena:${arena[i].id}`, title, href: `/dashboard/problems/${arena[i].id}` });
const temp = await mkdtemp(join(tmpdir(), 'physcratic-favourites-'));
let browser, server, down = false, empty = false, limited = false, invalid = false, hold = false, release;
const requests = [], errors = [];
try {
  await build({ entryPoints: ['tests/favourite-history-harness.tsx'], outfile: join(temp, 'bundle.js'), bundle: true, platform: 'browser', jsx: 'automatic', alias: { '@': process.cwd(), '@/lib/auth-client': resolve('tests/practice-session-fixture.ts') }, define: { 'process.env.NODE_ENV': '"development"', 'process.env': '{}' }, logLevel: 'silent' });
  execFileSync(process.execPath, [require.resolve('tailwindcss/lib/cli.js'), '-i', 'app/globals.css', '-o', join(temp, 'style.css')], { stdio: 'pipe' });
  server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');res.setHeader('cache-control','no-store');
    const reply = (body, status = 200) => { res.writeHead(status, { 'content-type':'application/json' });res.end(JSON.stringify(body)); };
    if (url.pathname === '/bundle.js' || url.pathname === '/style.css') { res.setHeader('content-type',url.pathname.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile(join(temp,url.pathname.slice(1))));return; }
    if (url.pathname === '/api/favourites') {
      const actor=req.headers.cookie?.match(/viewer=([^;]+)/)?.[1],expected=req.headers['x-community-account'];requests.push({actor,expected,after:url.searchParams.get('after')});
      if (actor !== expected) { reply({error:'Account changed'},409);return; }
      if (down) { reply({error:'Unavailable'},503);return; }
      if (limited) { reply({error:'Wait a minute'},429);return; }
      if (empty) { reply({items:[],nextCursor:null});return; }
      const items = [item(url.searchParams.has('after') ? 1 : 0, `${actor} favourite ${url.searchParams.has('after') ? 'two' : 'one'}`)];
      if (invalid) items[0].href='javascript:alert(1)';
      const result={items,nextCursor:url.searchParams.has('after')?null:'ph1.synthetic'};
      if (hold) { hold=false;await new Promise(r=>{release=r;}); }
      reply(result);return;
    }
    res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="en"><head><title>Favourite history</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body class="bg-background text-foreground"><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  for (const width of [375,1440]) for(const theme of ['light','dark']) {
    const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await context.addInitScript(theme=>document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.toggle('dark',theme==='dark')),theme);
    const before=requests.length;await page.goto(origin+'/?guest');await page.getByRole('link',{name:'Sign in to view favourites',exact:true}).waitFor();assert.equal(requests.length,before);
    await page.evaluate(()=>window.__setPracticeSession('A',true,true));await page.getByText('Checking your account.',{exact:true}).waitFor();assert.equal(requests.length,before);
    await page.evaluate(()=>window.__setPracticeSession('A'));await page.getByRole('link',{name:'A favourite one',exact:true}).waitFor();
    const next=page.getByRole('button',{name:'Next page',exact:true}),prev=page.getByRole('button',{name:'Previous page',exact:true}),refresh=page.getByRole('button',{name:'Refresh favourites',exact:true});
    await next.focus();await page.keyboard.press('Enter');await page.getByRole('link',{name:'A favourite two',exact:true}).waitFor();assert.equal(await next.isDisabled(),true);
    assert.match(await page.evaluate(()=>document.activeElement.textContent),/Refresh to show favourites/);
    await prev.click();await page.getByRole('link',{name:'A favourite one',exact:true}).waitFor();
    down=true;await refresh.click();await page.getByText('Your favourites could not be loaded. No list is available.',{exact:true}).waitFor();assert.equal(await page.getByText(/No public favourites/).count(),0);assert.equal(await page.getByText('A favourite one',{exact:true}).count(),0);
    down=false;empty=true;await refresh.click();await page.getByText(/No public favourites to show/).waitFor();
    empty=false;limited=true;await refresh.click();await page.getByText(/Too many favourite requests/).waitFor();limited=false;
    invalid=true;await refresh.click();await page.getByText(/No list is available/).waitFor();assert.equal(await page.locator('a[href^="javascript:"]').count(),0);invalid=false;
    await refresh.click();await page.getByRole('link',{name:'A favourite one',exact:true}).waitFor();
    // A response started for A must not appear after switching to B or reattaching A later.
    hold=true;await refresh.click();for(let n=0;!release&&n<100;n++)await new Promise(r=>setTimeout(r,20));
    assert.equal(typeof release,'function');await page.evaluate(()=>window.__setPracticeSession('B'));await page.getByRole('link',{name:'B favourite one',exact:true}).waitFor();release();release=undefined;
    await page.waitForTimeout(100);assert.equal(await page.getByText(/A favourite/).count(),0);
    const reads=requests.length;await page.evaluate(()=>window.__setPracticeSession('A'));await page.getByRole('link',{name:'A favourite one',exact:true}).waitFor();assert.ok(requests.length>reads);
    // A stale A view with B's authenticated cookie is rejected and requires an account reload.
    await context.addCookies([{name:'viewer',value:'B',url:origin}]);await refresh.click();await page.getByRole('button',{name:'Reload account',exact:true}).waitFor();assert.equal(await page.getByText(/A favourite/).count(),0);
    await page.getByRole('button',{name:'Reload account',exact:true}).click();await page.getByRole('link',{name:'B favourite one',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
    if(process.env.FAVOURITE_SCREENSHOTS){await mkdir(process.env.FAVOURITE_SCREENSHOTS,{recursive:true});await page.screenshot({path:join(process.env.FAVOURITE_SCREENSHOTS,`favourites-${width}-${theme}.png`),fullPage:true});}
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('Favourite UI passed: guest/pending, pagination/focus, empty/outage/limit/invalid responses, delayed account switches, stale cookies, mobile/desktop light/dark, overflow and axe.');
} finally { release?.();await browser?.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await rm(temp,{recursive:true,force:true}); }
