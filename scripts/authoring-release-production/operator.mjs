// Explicit CLI only. No automatic migration at import, build, startup or deployment.
import assert from 'node:assert/strict';
import {Client} from 'pg';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {target,verifyTLS,windowOpen,checkout,materials,readonly,executeTransaction,postcommit,hostname,sqlDigest,commonLock} from './core.mjs';

const args=process.argv.slice(2),mode=args.shift();
let committed=false,writeStarted=false,c,options;
try{
  assert.ok(['--read-only','--execute'].includes(mode),'EXPLICIT_MODE_REQUIRED');
  assert.equal(args.length,7,'SEVEN_NONSECRET_ARGUMENTS_REQUIRED');
  const [candidate,digest,out,start,end,hold,transport]=args;
  assert.equal(hold,'HOLD_AND_COMMON_LOCK_CONFIRMED');
  assert.equal(transport,'VERIFIED_WINDOWS_HOST');
  const deadline=windowOpen(start,end);checkout(candidate);
  const p=await materials(digest);
  options=target(process.env.AUTHORING_PRODUCTION_DIRECT_URL);delete process.env.AUTHORING_PRODUCTION_DIRECT_URL;
  const save=(name,value)=>writeFile(join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
  await save('binding.json',{mode,candidate,package_sha256:digest,production_sql_sha256:sqlDigest,
    target:{project:'divine-mode-82940461',branch:'br-quiet-dawn-b7m2zrt3',host:hostname,database:'neondb',role:'neondb_owner'},
    start,end,common_lock:commonLock,recovery:p.recovery,hold_attested:true,execution_host:'operator-verified Windows host',
    authority:'project owner full conditional alpha execution authorization; no staging exception used for Production'});
  c=new Client(options);c.on('error',()=>{});await c.connect();verifyTLS(c);
  const before=await readonly(c,p);await save('before.json',before);
  console.log(JSON.stringify({status:'PASS_READ_ONLY',schema_sha256:before.structure,recovery_records_match:true,ledger_absent:true}));
  if(mode==='--execute'){
    windowOpen(start,end);checkout(candidate);await materials(digest);
    // Durable attempt marker precedes BEGIN. On any uncertainty inspect, never replay.
    await save('execution-attempt.json',{at:new Date().toISOString(),candidate,package_sha256:digest,sql_sha256:sqlDigest});
    const timer=setTimeout(()=>c.connection.stream.destroy(),Math.max(1,deadline-Date.now()));
    writeStarted=true;
    let lockedBefore;
    try{lockedBefore=await executeTransaction(c,p,deadline);committed=true;}finally{clearTimeout(timer);}
    await save('commit-result.json',{status:'COMMITTED_REQUIRES_INDEPENDENT_READ_ONLY_VALIDATION',at:new Date().toISOString()});
    console.log(JSON.stringify({status:'COMMITTED_REQUIRES_INDEPENDENT_READ_ONLY_VALIDATION'}));
    await c.end();c=new Client({...options,application_name:'physcratic-production-independent-postcommit'});c.on('error',()=>{});
    await c.connect();verifyTLS(c);
    const verification=await postcommit(c,p,lockedBefore);
    await save('postcommit.json',{...verification,at:new Date().toISOString(),candidate,package_sha256:digest});
    console.log(JSON.stringify(verification));
  }
}catch{
  // PostgreSQL detail and driver options can contain sensitive record/URL values.
  // Preserve no raw exception or connection data in stdout or evidence.
  console.error(committed?'STOP: commit acknowledged; independent verification incomplete. DO NOT rerun.':
    writeStarted?'STOP: execution attempted. Outcome requires independent READ ONLY inspection. DO NOT rerun.':
    'STOP: preflight/package/target/window gate failed. No migration attempted.');
  process.exitCode=1;
}finally{if(options)options.password='';if(c)await c.end().catch(()=>{});delete process.env.AUTHORING_PRODUCTION_DIRECT_URL;}
