import assert from 'node:assert/strict';
import test from 'node:test';
import {appRoute,classifyInventory,assertQualified,responseKind,checkResponse} from '../scripts/csp/route-inventory.mjs';
const base=()=>({pages:['/learn','/dashboard'],sourcePages:['/learn','/dashboard'],prerender:{routes:{'/learn':{dataRoute:'/learn.rsc'}} as Record<string,{dataRoute:string;srcRoute?:string}>,dynamicRoutes:{} as Record<string,{fallback:boolean|null}>},matchers:['/dashboard/:path*'],hashRoutes:['/learn']});
test('new static, dynamic, admin and source-only pages cannot silently pass',()=>{
 assertQualified(classifyInventory(base()));
 for(const route of ['/settings','/admin/moderation','/admin/verification','/new/[id]','/_not-found']){
  const b=base();b.pages.push(route);b.sourcePages.push(route);assert.throws(()=>assertQualified(classifyInventory(b)),/Unclassified HTML/);
 }
 const b=base();b.pages.push('/learn/new');b.sourcePages.push('/learn/new');b.prerender.routes['/learn/new']={dataRoute:'/learn/new.rsc'};assert.throws(()=>assertQualified(classifyInventory(b)),/Unclassified HTML/);
 const c=base();c.sourcePages.push('/missing');assert.throws(()=>assertQualified(classifyInventory(c)),/mismatch/);
});
test('static/dynamic misclassification and incomplete generated slug hashes fail',()=>{
 const b=base();b.prerender.routes['/dashboard']={dataRoute:'/dashboard.rsc'};assert.throws(()=>assertQualified(classifyInventory(b)),/Unclassified HTML/);
 const c=base();c.pages.push('/learn/[slug]');c.sourcePages.push('/learn/[slug]');c.prerender.dynamicRoutes['/learn/[slug]']={fallback:false};c.prerender.routes['/learn/a']={srcRoute:'/learn/[slug]',dataRoute:'/learn/a.rsc'};
 assert.throws(()=>assertQualified(classifyInventory(c)),/Unclassified HTML/);c.hashRoutes.push('/learn/a');assertQualified(classifyInventory(c));
 c.prerender.dynamicRoutes['/learn/[slug]'].fallback=null;assert.throws(()=>assertQualified(classifyInventory(c)),/Unclassified HTML/);
});
test('route groups and parallel slots normalize; intercepting syntax fails explicitly',()=>{
 assert.equal(appRoute('/(private)/@main/settings'),'/settings');assert.throws(()=>appRoute('/(.)photo'),/Intercepting/);
 const b=base();b.pages.push('/dashboardish');b.sourcePages.push('/dashboardish');assert.throws(()=>assertQualified(classifyInventory(b)),/Unclassified HTML/);
});
test('HTML cannot masquerade as an API/RSC exemption and redirects are explicit',()=>{
 assert.equal(responseKind({status:200,contentType:'text/html',headers:{rsc:'1'}}),'html-document');
 assert.equal(responseKind({status:200,contentType:'text/x-component',knownDocument:true}),'rsc');
 assert.equal(responseKind({status:200,contentType:'text/x-component'}),'unclassified-rsc');
 assert.equal(responseKind({status:200,contentType:'application/json',headers:{rsc:'1'}}),'unclassified-representation');
 assert.equal(responseKind({status:307,contentType:'text/html'}),'redirect');assert.equal(responseKind({status:404,contentType:'text/html'}),'html-document');
 assert.equal(responseKind({status:200,contentType:'application/pdf'}),'non-document');assert.equal(responseKind({status:204}),'no-body');assert.equal(responseKind({status:200}),'unclassified-response');
});

test('observed handler HTML, unknown data and missing redirect location fail regression',()=>{
 const inventory=classifyInventory({...base(),handlers:['/api/new']});
 assert.throws(()=>checkResponse(inventory,'/api/new',{status:200,contentType:'text/html'}),/Unclassified HTML/);
 assert.throws(()=>checkResponse(inventory,'/unknown',{status:200,contentType:'text/x-component'}),/Unclassified/);
 assert.throws(()=>checkResponse(inventory,'/learn/',{status:308}),/Location/);
 assert.equal(checkResponse(inventory,'/learn?_rsc=x',{status:200,contentType:'text/x-component',headers:{rsc:'1'}}),'rsc');
 assert.equal(checkResponse(inventory,'/learn/',{status:308,location:'/learn'}),'redirect');
});

test('real source/build inventory rejects a new handler and stale build source',async()=>{
 const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {routeInventory}=await import('../scripts/csp/route-inventory.mjs');
 const root=await mkdtemp(join(tmpdir(),'csp-inventory-'));
 try{
  for(const dir of ['app/(public)/learn','app/api/new','app/admin','scripts/csp','.next/server'])await mkdir(join(root,dir),{recursive:true});
  await writeFile(join(root,'app/(public)/learn/page.tsx'),'');await writeFile(join(root,'app/api/new/route.ts'),'');await writeFile(join(root,'app/admin/error.tsx'),'');
  const json=async(p:string,v:unknown)=>writeFile(join(root,p),JSON.stringify(v));
  await json('.next/server/app-paths-manifest.json',{'/(public)/learn/page':'app/learn/page.js','/api/new/route':'app/api/new/route.js'});
  await json('.next/prerender-manifest.json',{routes:{'/learn':{dataRoute:'/learn.rsc'}},dynamicRoutes:{}});await json('.next/routes-manifest.json',{redirects:[{source:'/old',destination:'/learn'}],dataRoutes:[]});await json('scripts/csp/non-document-routes.json',[]);await writeFile(join(root,'.next/BUILD_ID'),'synthetic-build');
  let result=await routeInventory(root,{matchers:[],hashRoutes:['/learn']});assert.equal(result.boundaries[0].kind,'error');assert.equal(result.rscRoutes[0].dataRoute,'/learn.rsc');assert.equal(result.redirects.length,1);assert.throws(()=>assertQualified(result),/mismatch/);
  await json('scripts/csp/non-document-routes.json',['/api/new']);result=await routeInventory(root,{matchers:[],hashRoutes:['/learn']});assertQualified(result);
  await writeFile(join(root,'app/admin/page.tsx'),'');result=await routeInventory(root,{matchers:[],hashRoutes:['/learn']});assert.throws(()=>assertQualified(result),/mismatch/);
 }finally{await rm(root,{recursive:true,force:true});}
});
