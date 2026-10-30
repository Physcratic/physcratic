// Run with PLAYWRIGHT_MODULE=/tmp/terms-browser/node_modules/playwright/index.mjs node tests/terms-consent.browser.mjs
// Browser tooling stays outside runtime dependencies. Exercises actual Radix/React components.
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const temp = mkdtempSync(join(tmpdir(), 'terms-ux-'));
await build({ stdin: { contents: `import React,{useState} from 'react'; import {createRoot} from 'react-dom/client'; import {TermsConsent} from './components/terms-consent'; function App(){const [checked,setChecked]=useState(false);return <form><input aria-label="Email" defaultValue="saved@example.com"/><TermsConsent checked={checked} onChange={setChecked}/><button type="submit">Submit</button></form>} createRoot(document.getElementById('root')).render(<App/>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, outfile: join(temp,'bundle.js'), jsx: 'automatic', tsconfig: 'tsconfig.json' });
// Compile the real Tailwind utilities so viewport/overflow assertions exercise production styles.
const { execFileSync } = await import('node:child_process');
execFileSync(resolve('node_modules/.bin/tailwindcss'), ['-i','app/globals.css','-o',join(temp,'style.css'),'--content','components/terms-consent.tsx,components/terms-content.tsx,components/ui/dialog.tsx']);
const server = createServer((req,res) => { if(req.url==='/bundle.js') res.end(readFileSync(join(temp,'bundle.js'))); else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(join(temp,'style.css')));} else res.end('<html><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>'); });
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 for(const viewport of [{width:1280,height:800},{width:375,height:667}]){
  const page=await browser.newPage({viewport}); await page.goto(`http://127.0.0.1:${server.address().port}`);
  const checkbox=page.locator('#account-terms'); const trigger=page.getByRole('button',{name:'Terms of Service',exact:true});
  await checkbox.waitFor(); assert.equal(await checkbox.isChecked(),false); assert.equal(await page.locator('form').evaluate(el=>el.checkValidity()),false);
  await trigger.focus(); await page.keyboard.press('Enter'); const dialog=page.getByRole('dialog'); await dialog.waitFor();
  assert.equal(await checkbox.isChecked(),false); assert.equal(await dialog.locator('h2').count(),12);
  const scroller=page.getByLabel('Complete Terms of Service'); await scroller.evaluate(el=>{el.scrollTop=el.scrollHeight}); assert.equal(await checkbox.isChecked(),false); assert.ok(await scroller.evaluate(el=>el.scrollHeight>el.clientHeight));
  const bounds=await dialog.boundingBox(); assert.ok(bounds.width<=viewport.width && bounds.height<=viewport.height);
  for(let i=0;i<10;i++){await page.keyboard.press('Tab'); assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));}
  await page.keyboard.press('Escape'); await dialog.waitFor({state:'hidden'}); assert.equal(await checkbox.isChecked(),false);
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true); assert.equal(await page.getByLabel('Email').inputValue(),'saved@example.com');
  await trigger.click(); await page.getByRole('button',{name:'I agree',exact:true}).click(); await dialog.waitFor({state:'hidden'}); assert.equal(await checkbox.isChecked(),true); assert.equal(await page.locator('form').evaluate(el=>el.checkValidity()),true);
  await trigger.click(); await page.getByRole('button',{name:'Close',exact:true}).first().click(); assert.equal(await checkbox.isChecked(),true);
  await checkbox.click(); assert.equal(await checkbox.isChecked(),false); await checkbox.focus(); await page.keyboard.press('Space'); assert.equal(await checkbox.isChecked(),true);
  console.log(`PASS dialog consent, dismiss, keyboard trap/restore, inputs and viewport ${viewport.width}`); await page.close();
 }
} finally {await browser.close(); server.close();rmSync(temp,{recursive:true,force:true});}
