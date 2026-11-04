// Test-only classification. Not a publication adapter or deployed middleware.
import assert from 'node:assert/strict';
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
export function appRoute(path){
 const parts=path.replaceAll('\\','/').split('/').filter(Boolean);
 assert.ok(!parts.some(p=>/^\(\./.test(p)),'Intercepting routes require explicit inventory support');
 return '/'+parts.filter(p=>!p.startsWith('@')&&!/^\([^)]*\)$/.test(p)).join('/');
}
function nonceCovered(route,matchers){
 return matchers.some(m=>{
  if(m.endsWith('/:path*')){const prefix=m.slice(0,-'/:path*'.length);return route===prefix||route.startsWith(prefix+'/');}
  return route===m&&!route.includes('[');
 });
}
export function classifyInventory({pages,handlers=/** @type {string[]} */([]),boundaries=[],sourcePages,prerender,matchers,hashRoutes,redirects=[],dataRoutes=[]}){
 const hashes=new Set(hashRoutes),compiled=new Set(pages),errors=[];
 for(const route of sourcePages)if(!compiled.has(route))errors.push('Source page absent from build: '+route);
 for(const route of pages)if(route!=='/_not-found'&&!sourcePages.includes(route))errors.push('Build page absent from source: '+route);
 const documents=[];
 for(const route of pages){
  const variants=Object.entries(prerender.routes).filter(([key,v])=>key===route||v.srcRoute===route).map(([key])=>key);
  const family=route.includes('[')&&prerender.dynamicRoutes?.[route]?.fallback===false;
  let strategy='unclassified';
  if(variants.length&&(!route.includes('[')||family))strategy=variants.every(r=>hashes.has(r))?'static-hashes':'unclassified';
  else if(nonceCovered(route,matchers))strategy='request-nonce';
  documents.push({route,rendering:variants.length?'prerendered':'dynamic',variants,strategy});
 }
 // Every prerendered HTML/data-route entry must have an App page, including generated errors.
 for(const [route,v]of Object.entries(prerender.routes))if(v.dataRoute&&!documents.some(d=>d.variants.includes(route)))errors.push('Unclassified prerendered document: '+route);
 return {documents,rscRoutes:/** @type {{route:string,dataRoute:string}[]} */([]),buildId:'',handlers:handlers.map(route=>({route,kind:'route-handler',contract:'classify actual response by status/content-type; HTML is never exempt'})),boundaries:boundaries.map(b=>({...b,contract:'inherits the responding document policy; requires error-path runtime checks'})),redirects,dataRoutes,uncovered:documents.filter(d=>d.strategy==='unclassified').map(d=>d.route),errors};
}
export function assertQualified(inventory){
 assert.deepEqual(inventory.errors,[],'Route inventory/build mismatch');
 assert.deepEqual(inventory.uncovered,[],'Unclassified HTML documents: '+inventory.uncovered.join(', '));
}
// RSC is a representation of an existing document, not a separate HTML exemption.
export function responseKind({status,contentType='',headers={},knownDocument=false}){
 if([301,302,303,307,308].includes(status))return 'redirect';
 if(status===204||status===304)return 'no-body';
 const type=contentType.split(';')[0].trim().toLowerCase();
 if(type==='text/html'||type==='application/xhtml+xml')return 'html-document';
 if(type==='text/x-component')return knownDocument?'rsc':'unclassified-rsc';
 if(headers.rsc==='1'||headers['next-router-prefetch']==='1')return 'unclassified-representation';
 if(type)return 'non-document';
 return 'unclassified-response';
}
export async function routeInventory(root,{matchers,hashRoutes}){
 const json=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
 const [paths,prerender,routes,reviewedHandlers]=await Promise.all([json('.next/server/app-paths-manifest.json'),json('.next/prerender-manifest.json'),json('.next/routes-manifest.json'),json('scripts/csp/non-document-routes.json')]);
 const sourcePages=[],sourceHandlers=[],boundaries=[];
 async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=resolve(dir,entry.name);
  if(entry.isDirectory())await walk(path);
  else if(/^(?:page|route|error|global-error|not-found)\.(?:tsx?|jsx?)$/.test(entry.name)){
   const kind=entry.name.split('.')[0],route=appRoute(relative(resolve(root,'app'),dir));
   if(kind==='page')sourcePages.push(route);else if(kind==='route')sourceHandlers.push(route);else boundaries.push({route,kind});
  }
 }}
 await walk(resolve(root,'app'));
 const pages=Object.keys(paths).filter(p=>p.endsWith('/page')).map(p=>appRoute(p.slice(0,-5))),handlers=Object.keys(paths).filter(p=>p.endsWith('/route')).map(p=>appRoute(p.slice(0,-6)));
 const inventory=classifyInventory({pages,handlers,boundaries,sourcePages,prerender,matchers,hashRoutes,redirects:routes.redirects??[],dataRoutes:routes.dataRoutes??[]});
 for(const route of sourceHandlers)if(!handlers.includes(route))inventory.errors.push('Source handler absent from build: '+route);
 for(const route of handlers)if(!reviewedHandlers.includes(route))inventory.errors.push('Unreviewed route-handler response contract: '+route);
 for(const route of reviewedHandlers)if(!handlers.includes(route))inventory.errors.push('Stale route-handler response contract: '+route);
 // Preserve the App Router RSC mappings, which Next's Pages dataRoutes array does not enumerate.
 inventory.rscRoutes=Object.entries(prerender.routes).filter(([,v])=>v.dataRoute).map(([route,v])=>({route,dataRoute:v.dataRoute}));
 inventory.buildId=(await readFile(resolve(root,'.next/BUILD_ID'),'utf8')).trim();
 await mkdir(resolve(root,'build/csp'),{recursive:true});
 await writeFile(resolve(root,'build/csp/route-inventory.json'),JSON.stringify(inventory,null,2));
 return inventory;
}
export function documentKnown(inventory,path){
 const pathname=new URL(path,'http://127.0.0.1').pathname.replace(/\/$/,'')||'/';
 return inventory.documents.some(d=>{
  const pattern=d.route.split('/').filter(Boolean).map(s=>s.startsWith('[[...')?'(?:/.*)?':s.startsWith('[...')?'/.+':s.startsWith('[')?'/[^/]+':'/'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')||'/';
  return d.variants.includes(pathname)||new RegExp('^'+pattern+'$').test(pathname);
 })||inventory.rscRoutes?.some(d=>d.dataRoute===pathname);
}
export function checkResponse(inventory,path,response){
 const knownDocument=documentKnown(inventory,path),kind=responseKind({...response,knownDocument});
 assert.ok(!kind.startsWith('unclassified'),'Unclassified response '+path+': '+kind);
 if(kind==='html-document')assert.ok(knownDocument,'Unclassified HTML response: '+path);
 if(kind==='redirect')assert.ok(response.location,'Redirect missing Location: '+path);
 return kind;
}
