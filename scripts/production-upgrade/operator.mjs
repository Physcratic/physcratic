// Explicit reviewed-window CLI only. No automatic import/build/deploy execution.
import assert from 'node:assert/strict';
import {Client} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {materials,approval,target,verifyTLS,checkout,hash,execute,preflight,postcommit,binding} from './core.mjs';
export async function main(args) {
 let c,options,timer,attempted=false,committed=false;
 try {
  assert.equal(args.length,7,'EXPLICIT_ARGUMENTS_REQUIRED');
  const [mode,candidate,packageDigest,approvalPath,approvalDigest,out,hold]=args;
  assert.ok(['--inspect-reviewed-window','--execute-reviewed-window'].includes(mode));
  assert.equal(hold,'WRITER_HOLD_AND_SEPARATE_OWNER_AUTHORIZATION_CONFIRMED');
  checkout(candidate);
  const p=await materials(packageDigest),raw=await readFile(approvalPath);
  assert.equal(hash(raw),approvalDigest,'APPROVAL_DIGEST_MISMATCH');
  const a=JSON.parse(raw);const end=approval(a,candidate);
  options=target(process.env.PHYSCRATIC_UPGRADE_DIRECT_URL);
  delete process.env.PHYSCRATIC_UPGRADE_DIRECT_URL;
  const save=(name,data)=>writeFile(join(out,name),JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
  await save('binding.json',{candidate,packageDigest,approvalDigest,mode,target:binding,start:a.start,end:a.end});
  c=new Client({...options,application_name:'physcratic-reviewed-upgrade-0018'});c.on('error',()=>{});
  timer=setTimeout(()=>c.connection.stream.destroy(),Math.max(1,end-Date.now()));
  await c.connect();verifyTLS(c);
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try{await preflight(c,p,a);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}
  await save('preflight.json',{state:'passed',at:new Date().toISOString()});
  if(mode==='--inspect-reviewed-window'){console.log('PASS: reviewed read-only preflight. No upgrade attempted.');return;}
  approval(a,candidate);checkout(candidate);await materials(packageDigest);
  // Exclusive durable marker prevents accidental retry in this evidence directory.
  await save('attempt.json',{state:'attempting',candidate,at:new Date().toISOString()});
  attempted=true;
  const result=await execute(c,p,a,candidate);committed=true;
  await save('commit.json',result);
  await c.end();c=new Client({...options,application_name:'physcratic-upgrade-independent-postcommit'});c.on('error',()=>{});await c.connect();verifyTLS(c);
  const checked=await postcommit(c,p,result);await save('postcommit.json',checked);
  console.log('PASS: commit independently verified on a new connection. Do not replay.');
 } catch {
  console.error(committed?'STOP: commit acknowledged, evidence incomplete. Independently inspect. Never replay.':attempted?'STOP: execution attempted. Commit outcome requires independent inspection. Never replay.':'STOP: package, target, approval, evidence or preflight rejected. No upgrade attempted.');
  process.exitCode=1;
 } finally {clearTimeout(timer);if(options)options.password='';if(c)await c.end().catch(()=>{});delete process.env.PHYSCRATIC_UPGRADE_DIRECT_URL;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main(process.argv.slice(2));
