import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {materials,target,approval,binding,interior,ledger,hash} from './core.mjs';
export async function packageCheck(){
 const digest=hash(await readFile(new URL('PACKAGE_SHA256SUMS',import.meta.url)));
 const p=await materials(digest);
 const rows=p.files.filter((_,i)=>[1,2,3,4,5,6,16].includes(i+1)).map(f=>({id:f.id,sha256:f.sha256,result:'verified',source_commit:'1'.repeat(40),applied_by:'synthetic',applied_at:new Date()}));
 ledger(rows,p.files);
 assert.throws(()=>ledger([...rows,...[{...rows[0],id:'0017_unknown'}]],p.files));
 assert.throws(()=>ledger(rows.map((r,i)=>({...r,sha256:i?'0'.repeat(64):r.sha256})),p.files));
 await assert.rejects(materials('0'.repeat(64)));
 assert.equal(interior('BEGIN;\nSELECT 1;\nCOMMIT;\n',true),'SELECT 1;');
 assert.throws(()=>interior('SELECT 1;',true));
}
export function targetCheck(){
 const url='postgresql://neondb_owner:synthetic@ep-snowy-heart-b7c1220y.c-13.us-east-1.aws.neon.tech/neondb?sslmode=require';
 assert.equal(target(url).database,'neondb');
 for(const bad of [url.replace('ep-snowy','ep-other'),url.replace('neondb?','wrong?'),url+'&options=evil',url+'&sslmode=require',url.replace('sslmode=require','sslmode=disable'),url.replace('heart-b7c1220y.','heart-b7c1220y-pooler.'),url.replace('neondb_owner','other')])assert.throws(()=>target(bad));
 assert.throws(()=>approval({},'1'.repeat(40)));
 const now=Date.now(),a={target:binding,candidate:'1'.repeat(40),baselineSchema:'a'.repeat(64),baselineRecords:'b'.repeat(64),approvalReference:'owner-reviewed',recoveryReference:'reviewed-recovery',recoveryErasurePlan:'reviewed-erasure',writerHoldReference:'approved-hold',disabledFeaturesReference:'reviewed-features-off',recoveryVerifiedAt:new Date(now).toISOString(),start:new Date(now-1000).toISOString(),end:new Date(now+60000).toISOString()};
 approval(a,a.candidate,now);assert.throws(()=>approval({...a,target:{...binding,branch:'other'}},a.candidate,now));
 assert.throws(()=>approval({...a,end:new Date(now-1).toISOString()},a.candidate,now));
}
