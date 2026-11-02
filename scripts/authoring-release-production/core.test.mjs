import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {target,windowOpen,interior,hash,sqlDigest,baseline} from './core.mjs';
const url='postgresql://neondb_owner:synthetic-test-only@ep-snowy-heart-b7c1220y.c-13.us-east-1.aws.neon.tech/neondb?sslmode=require';
test('Production connection pins direct endpoint, owner, database, port and certificate validation',()=>{
  const x=target(url);assert.deepEqual(x.ssl,{rejectUnauthorized:true});assert.equal(x.enableChannelBinding,true);
  for(const bad of [url.replace('snowy-heart-b7c1220y','green-waterfall-b7qaw260'),url.replace('.c-13.','-pooler.c-13.'),url.replace('neondb_owner','physcratic_integration_app'),url.replace('/neondb?','/other?'),url.replace('sslmode=require','sslmode=disable'),url+'&sslrootcert=anything',url.replace('/neondb?',':5555/neondb?')])assert.throws(()=>target(bad));
});
test('execution requires a currently open window of no more than 30 minutes',()=>{
  const start='2026-11-02T00:00:00Z',end='2026-11-02T00:30:00Z';assert.ok(windowOpen(start,end,Date.parse(start)));
  for(const now of [Date.parse(start)-1,Date.parse(end)])assert.throws(()=>windowOpen(start,end,now));
  assert.throws(()=>windowOpen(start,'2026-11-02T00:31:00Z',Date.parse(start)));
});
test('approved SQL hash and every interior byte survive transaction transport',async()=>{
  const sql=await readFile(new URL('package/PRODUCTION_MIGRATION_DRAFT.sql',import.meta.url),'utf8');
  assert.equal(hash(sql),sqlDigest);
  const body=interior(sql);assert.equal(sql.slice(0,sql.indexOf('\nBEGIN;\n'))+'\nBEGIN;\n'+body+sql.slice(sql.lastIndexOf('\nCOMMIT;')),sql);
  assert.match(body,/pg_advisory_xact_lock\(hashtextextended\('physcratic:authoring:migrations:v1',0\)\)/);
  assert.throws(()=>interior(sql.replace('\nCOMMIT;','\nROLLBACK;')));
});
test('partial/applied ledgers, schema drift, locale drift and stale recovery all stop',()=>{
  const p={baseline:{structural_schema_sha256:'schema',catalog:{database:{locale:'C.UTF-8'}}},recovery:{legacy_record_digest:'rows'}};
  const s={ledgers:{production:null,integration:null},structure:'schema',report:{database:{locale:'C.UTF-8'}},record_digest:'rows'};
  baseline(s,p);
  for(const change of [{ledgers:{production:'physcratic_production_migrations',integration:null}},{structure:'drift'},{report:{database:{locale:'wrong'}}},{record_digest:'new rows'}])assert.throws(()=>baseline({...s,...change},p));
});
