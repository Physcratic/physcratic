// Extends the existing real-editor/API/disposable-PG harness, with synthetic sessions and storage.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {statementPdfFixture,png} from './author-media-fixtures.ts';
const tools=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS,'package.json'));
const {default:AxeBuilder}=tools('@axe-core/playwright');
const file=(name,buffer,mimeType)=>({name,buffer,mimeType});
const pdf=statementPdfFixture();
export async function runPdfStudioBrowser({browser,origin,pool,storage,setFail}) {
 const wait=async(check,label)=>{const end=Date.now()+20000;while(Date.now()<end){if(await check())return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out: '+label);};
 for(const width of [375,1440])for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
  const owner=`pdf-studio-${width}-${theme}`;await pool.query('INSERT INTO "user"(id) VALUES($1)',[owner]);await context.addCookies([{name:'studio_author',value:owner,url:origin}]);
  await context.addInitScript(theme=>{localStorage.setItem('physcratic.studio.mode','simple');localStorage.setItem('physcratic.tour.studio.v1','seen');addEventListener('DOMContentLoaded',()=>document.documentElement.classList.toggle('dark',theme==='dark'),{once:true});},theme);
  page.on('dialog',d=>d.accept());page.on('pageerror',e=>errors.push(e.stack??e.message));
  await page.goto(origin);await page.getByLabel('Upload PDFs instead',{exact:true}).check();
  await page.getByLabel('Title',{exact:true}).fill('Moving Cart');await page.waitForURL(url=>url.searchParams.has('draft'));
  const id=new URL(page.url()).searchParams.get('draft'),base=origin+'/api/authored-problems',headers={origin};
  const draft=async()=>{const r=await context.request.get(base+'/drafts/'+id);assert.equal(r.status(),200);return r.json();};
  await page.getByLabel('Difficulty rating',{exact:true}).fill('1200');
  await page.getByRole('checkbox',{name:/I wrote this problem/}).check();
  let uploadPosts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/media'))uploadPosts++;});
  const upload=page.getByLabel('Upload problem PDF',{exact:true});
  const uploadColors=await upload.evaluate(el=>({button:getComputedStyle(el,'::file-selector-button').color,text:getComputedStyle(el).color}));assert.equal(uploadColors.button,uploadColors.text,'file chooser text follows the current theme');
  await upload.setInputFiles(file('too-large.pdf',Buffer.alloc(3*1024*1024+1),'application/pdf'));
  await page.getByText('Choose a nonempty file up to 3 MiB.',{exact:true}).waitFor();assert.equal(uploadPosts,0);
  storage.failPut=true;await upload.setInputFiles(file('failure.pdf',pdf,'application/pdf'));
  await wait(async()=>await upload.isEnabled(),'failed upload settled');assert.equal(await page.getByRole('link',{name:'Open or download Statement PDF',exact:true}).count(),0);storage.failPut=false;
  await upload.setInputFiles(file('statement.pdf',pdf,'application/pdf'));await page.getByRole('link',{name:'Open or download Statement PDF',exact:true}).waitFor();
  await page.getByLabel('Upload Solution PDF',{exact:true}).setInputFiles(file('solution.pdf',pdf,'application/pdf'));await page.getByRole('link',{name:'Open or download Private solution PDF',exact:true}).waitFor();
  assert.equal(await page.getByText('Manage uploaded files and safe cleanup',{exact:true}).count(),0);
  assert.equal(await page.getByRole('radiogroup',{name:'Quick pick a band'}).count(),0);
  assert.equal(await page.getByRole('heading',{name:'Part a',exact:true}).count(),0);
  assert.equal(await page.getByLabel('Upload problem PDF',{exact:true}).count(),0,'replacement control takes the initial upload slot');
  await page.getByRole('region',{name:'Private solution PDF',exact:true}).getByText('Synthetic statement page one',{exact:true}).waitFor();
  await wait(async()=>(await draft()).content.attachments.some(a=>a.purpose==='statement-pdf'),'initial statement saved');
  const oldStatement=(await draft()).content.attachments.find(a=>a.purpose==='statement-pdf').id;
  await page.getByLabel('Replace statement PDF',{exact:true}).setInputFiles(file('replacement.pdf',pdf,'application/pdf'));
  await wait(async()=>(await draft()).content.attachments.some(a=>a.purpose==='statement-pdf'&&a.id!==oldStatement),'replacement saved');
  assert.equal((await context.request.get(base+'/'+id+'/media/'+oldStatement)).status(),200,'recoverable old draft media retained');
  assert.equal((await pool.query('SELECT state FROM author_media WHERE id=$1',[oldStatement])).rows[0].state,'ready');
  assert.equal(await page.locator('#simple-title').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('input[type=checkbox]')) & Node.DOCUMENT_POSITION_FOLLOWING)),true,'title precedes workflow selector');
  const first=page.getByRole('region',{name:/^(Question and answer|Part a)$/,exact:true});
  await first.getByLabel('Answer type',{exact:true}).selectOption('numeric');await first.getByLabel('Expected value',{exact:true}).fill('2');await first.getByLabel('Units',{exact:true}).fill('m');await first.getByLabel('Relative tolerance',{exact:true}).fill('0');
  await page.getByRole('button',{name:'Add part b',exact:true}).click();const second=page.getByRole('region',{name:'Part b',exact:true});
  await second.getByLabel('Answer type',{exact:true}).selectOption('expression');await second.getByLabel('Expected expression',{exact:true}).fill('x+x');await second.getByRole('button',{name:'+ Add variable',exact:true}).click();await second.getByLabel('Symbol',{exact:true}).fill('x');
  await page.getByRole('button',{name:'Add part c',exact:true}).click();await page.getByRole('button',{name:'Add part d',exact:true}).click();await page.getByRole('button',{name:'Remove part d',exact:true}).click();
  const saved=()=>wait(async()=>!(await draft()).privateParts.some(p=>p.key===null)&&(await page.getByRole('status').allTextContents()).some(t=>t.includes('All changes saved')),'autosave');await saved();
  await wait(async()=>await page.locator('[data-pdf-rendered=true]').count()===2,'both owner PDF previews rendered after save');
  if(process.env.PDF_STUDIO_SCREENSHOTS){await mkdir(process.env.PDF_STUDIO_SCREENSHOTS,{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(process.env.PDF_STUDIO_SCREENSHOTS,`studio-pdf-${width}-${theme}.png`),fullPage:true});}
  // Lost/failed writes remain recoverable and do not silently create a new version.
  setFail(1);await first.getByLabel('Expected value',{exact:true}).fill('7');await page.getByRole('status',{name:'Problem status',exact:true}).filter({hasText:'Temporary save failure'}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Restore local work',exact:true}).click();await page.getByRole('button',{name:'Save now',exact:true}).click();await saved();
  assert.equal(await page.getByLabel('Upload PDFs instead',{exact:true}).isChecked(),true);assert.equal(await page.getByLabel('Expected value',{exact:true}).inputValue(),'7');
  const before=await draft();assert.equal(before.content.context.length,0);assert.equal(before.content.sections.flatMap(s=>s.parts).every(p=>p.blocks.length===0),true);assert.equal(before.privateParts.length,3);
  assert.deepEqual(before.content.sections.flatMap(s=>s.parts).map(part=>before.privateParts.find(p=>p.partId===part.id).key.kind),['numeric','expression','manual']);
  await page.getByRole('button',{name:'Student preview',exact:true}).click();const preview=page.getByRole('article',{name:'Student-facing preview',exact:true});await preview.waitFor();
  assert.equal(await preview.getByRole('link',{name:/private solution/i}).count(),0);assert.equal(await preview.getByRole('button',{name:'Read statement PDF 1',exact:true}).count(),0);
  await preview.getByText('Synthetic statement page one',{exact:true}).waitFor();await preview.getByRole('button',{name:'Next page',exact:true}).click();await preview.getByText('Synthetic statement page two',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Write',exact:true}).click();await page.getByRole('button',{name:'Publish',exact:true}).click();
  await wait(async()=>(await pool.query('SELECT state FROM authored_problem WHERE id=$1',[id])).rows[0].state==='published','PDF publication');
  const pub=await (await context.request.get(base+'/'+id)).json(),rev=pub.id,part=pub.content.sections[0].parts[0].id,secret=before.content.attachments.find(a=>a.purpose==='solution-pdf').id,statement=before.content.attachments.find(a=>a.purpose==='statement-pdf').id;
  assert.equal(JSON.stringify(pub).includes(secret),false);assert.equal('privateParts'in pub,false);
  const guest=await browser.newContext({viewport:{width,height:1000}});await guest.addInitScript(theme=>addEventListener('DOMContentLoaded',()=>document.documentElement.classList.toggle('dark',theme==='dark'),{once:true}),theme);await guest.addCookies([{name:'viewer',value:'guest',url:origin}]);const reader=await guest.newPage();
  await reader.goto(origin+'/dashboard/authored/'+id);await reader.getByText('Synthetic statement page one',{exact:true}).waitFor();assert.equal(await reader.getByText('Problem room',{exact:true}).count(),0);assert.equal(await reader.getByRole('button',{name:'Recheck publication',exact:true}).count(),0);assert.equal(await reader.getByRole('button',{name:'Read statement PDF 1',exact:true}).count(),0);await reader.getByText('Synthetic statement page one',{exact:true}).waitFor();if(process.env.PDF_STUDIO_SCREENSHOTS){await reader.evaluate(()=>window.scrollTo(0,0));await reader.screenshot({path:join(process.env.PDF_STUDIO_SCREENSHOTS,`reader-pdf-${width}-${theme}.png`),fullPage:true});}
  await reader.getByRole('button',{name:'Next page',exact:true}).click();await reader.getByText('Synthetic statement page two',{exact:true}).waitFor();
  const statementResponse=await guest.request.get(base+'/'+id+'/media/'+statement+'?revision='+rev);assert.equal(statementResponse.status(),200);assert.match(statementResponse.headers()['content-disposition'],/^attachment/);assert.match(statementResponse.headers()['content-security-policy'],/sandbox/);
  assert.equal((await guest.request.get(base+'/'+id+'/media/'+secret+'?revision='+rev)).status(),404);
  assert.equal((await guest.request.get(base+'/drafts/'+id)).status(),401);assert.equal(await reader.getByRole('button',{name:'Submit answer',exact:true}).count(),0);
  const learner=await browser.newContext({viewport:{width,height:1000}});await learner.addInitScript(theme=>addEventListener('DOMContentLoaded',()=>document.documentElement.classList.toggle('dark',theme==='dark'),{once:true}),theme);await learner.addCookies([{name:'viewer',value:'workflow-student',url:origin}]);
  assert.equal((await learner.request.get(base+'/drafts/'+id)).status(),404);
  const view=()=>learner.request.post(base+'/'+id+'/solutions/'+part+'/view',{headers,data:{revisionId:rev}});
  assert.equal((await view()).status(),404);
  const permission=base+'/drafts/'+id+'/solutions/'+part+'/permission';let meta=await(await context.request.get(permission+'?revision='+rev)).json();
  const allow=await context.request.put(permission,{headers,data:{revisionId:rev,version:meta.version,enabled:true,mediaIds:[secret],expiresAt:null}});assert.equal(allow.status(),200,await allow.text());
  const reveal=await view();assert.equal(reveal.status(),200,await reveal.text());const revealed=await reveal.json();assert.equal(JSON.stringify(revealed).includes('expected'),false);
  const solution=await learner.request.get(base+'/'+id+'/solutions/'+part+'/media/'+secret+'?revision='+rev);assert.equal(solution.status(),200);assert.deepEqual(await solution.body(),pdf);
  const student=await learner.newPage();student.on('dialog',d=>d.accept());await student.goto(origin+'/dashboard/authored/'+id);await student.getByLabel('Numerical answer',{exact:true}).fill('7');await student.getByLabel('Units',{exact:true}).fill('m');await student.getByRole('button',{name:'Submit answer',exact:true}).click();await student.getByRole('heading',{name:/^Correct · saved attempt/}).waitFor();
  assert.equal((await pool.query('SELECT assisted FROM authored_attempt WHERE user_id=$1 AND revision_id=$2',['workflow-student',rev])).rows[0].assisted,true);
  await student.getByLabel('Choose part',{exact:true}).selectOption(pub.content.sections[0].parts[1].id);await student.getByLabel('Expression answer',{exact:true}).and(student.locator('math-field')).waitFor();
  meta=await(await context.request.get(permission+'?revision='+rev)).json();assert.equal((await context.request.put(permission,{headers,data:{revisionId:rev,version:meta.version,enabled:false,mediaIds:[],expiresAt:null}})).status(),200);assert.equal((await view()).status(),404);assert.equal((await learner.request.get(base+'/'+id+'/solutions/'+part+'/media/'+secret+'?revision='+rev)).status(),404);
  // Change the same problem to images only, preserving keys, old revision and original PDF bindings.
  await page.getByRole('button',{name:'Remove PDF reference',exact:true}).first().click();
  for(const n of [1,2,3]) {
   const region=page.getByRole('region',{name:'Part '+String.fromCharCode(96+n),exact:true});await region.getByLabel('Upload image to part '+String.fromCharCode(96+n)+' statement',{exact:true}).setInputFiles(file('part-'+n+'.png',png,'image/png'));
   await region.getByLabel('Part '+String.fromCharCode(96+n)+' statement image 1 alt text',{exact:true}).fill('Synthetic setup and question for part '+n);
  }
  await first.getByLabel('Upload image to part a statement',{exact:true}).setInputFiles(file('detail.png',png,'image/png'));await first.getByLabel('Part a statement image 2 alt text',{exact:true}).fill('Synthetic additional diagram for part one');await saved();
  await page.getByRole('button',{name:'Publish new version',exact:true}).click();await wait(async()=>(await pool.query('SELECT count(*)::int AS n FROM authored_revision WHERE problem_id=$1',[id])).rows[0].n===2,'image publication');
  const updated=await(await context.request.get(base+'/'+id)).json();assert.notEqual(updated.id,rev);assert.equal(updated.content.attachments.some(a=>a.purpose==='statement-pdf'),false);
  assert.equal((await guest.request.get(base+'/'+id+'/media/'+statement+'?revision='+rev)).status(),200);assert.equal((await context.request.get(base+'/'+id+'/media/'+statement+'?revision='+rev)).status(),200);
  await reader.reload();await reader.getByAltText('Synthetic additional diagram for part one',{exact:true}).waitFor();assert.equal(await reader.getByRole('button',{name:'Read statement PDF 1',exact:true}).count(),0);
  assert.equal((await pool.query('SELECT state FROM author_media WHERE id=$1',[statement])).rows[0].state,'ready','historical/recoverable uploads are not physically deleted');
  const imageDraft=await draft();await page.reload();await page.waitForFunction(()=>document.querySelector('#simple-title')?.value==='Moving Cart');await page.getByLabel('Upload PDFs instead',{exact:true}).waitFor();assert.equal(await page.getByLabel('Upload PDFs instead',{exact:true}).isChecked(),true);assert.deepEqual((await draft()).privateParts,imageDraft.privateParts);
  // Preview must not discard an incomplete native answer held by Simple's input buffer.
  await page.getByLabel('Upload PDFs instead',{exact:true}).uncheck();const nativePart=page.getByRole('region',{name:'Part a',exact:true});const field=nativePart.getByLabel('Final Answer (Solution)',{exact:true}).and(nativePart.locator('input'));await field.waitFor();
  const enter=value=>field.fill(value);
  await enter('x+');await page.getByText('The answer stops too soon. Something is missing after the last operator.',{exact:true}).waitFor();await page.getByRole('button',{name:'Student preview',exact:true}).click();await page.getByRole('button',{name:'Write',exact:true}).click();
  assert.equal(await field.inputValue(),'x+');await page.getByLabel('Upload PDFs instead',{exact:true}).click();await page.getByText('Correct the current final answer before changing workflows. Your input is retained.',{exact:true}).waitFor();assert.equal(await page.getByLabel('Upload PDFs instead',{exact:true}).isChecked(),false);
  await page.getByText('Correct the current final answer before changing workflows. Your input is retained.',{exact:true}).waitFor();
  await enter('7');await saved();await page.reload();await page.waitForFunction(()=>document.querySelector('#simple-title')?.value==='Moving Cart');assert.equal(await page.getByLabel('Upload PDFs instead',{exact:true}).isChecked(),false);await page.getByLabel('Upload PDFs instead',{exact:true}).check();await saved();assert.deepEqual((await draft()).privateParts,imageDraft.privateParts);
  for(const target of [page,reader,student]){assert.equal(await target.evaluate(()=>document.documentElement.classList.contains('dark')),theme==='dark');assert.equal(await target.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const result=await new AxeBuilder({page:target}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(result.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);}
  if(process.env.PDF_STUDIO_SCREENSHOTS){await mkdir(process.env.PDF_STUDIO_SCREENSHOTS,{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(process.env.PDF_STUDIO_SCREENSHOTS,`studio-${width}-${theme}.png`),fullPage:true});await reader.evaluate(()=>window.scrollTo(0,0));await reader.screenshot({path:join(process.env.PDF_STUDIO_SCREENSHOTS,`reader-${width}-${theme}.png`),fullPage:true});}
  assert.equal((await pool.query('SELECT attempts FROM author_media_usage WHERE user_id=$1',[owner])).rows[0].attempts,8,'isolated tutor stays within the unchanged daily upload limit');
  assert.deepEqual(errors,[]);await guest.close();await learner.close();await context.close();console.log(`PASS PDF Studio ${width}px ${theme}: uploads, multipart keys, recovery, PDF pages, guest reading, private solution approval/revocation, assisted grading, image-only revision, account isolation and axe`);
 }
}
