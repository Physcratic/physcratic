// Built production route with clean synthetic environment and unreachable schema.
// node --conditions=react-server --import tsx tests/authored-attribution.disabled.mjs
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {cleanRoot} from '../scripts/csp/local.mjs';
import {childEnvironment} from '../scripts/csp/support.mjs';
const require=createRequire(import.meta.url);await cleanRoot(process.cwd());
const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','-H','127.0.0.1','-p',String(port)],{env:childEnvironment(process.cwd(),port),stdio:['ignore','pipe','pipe']});
let log='';child.stdout.on('data',data=>{log=(log+data).slice(-10000);});child.stderr.on('data',data=>{log=(log+data).slice(-10000);});
try{
 const origin=`http://127.0.0.1:${port}`;
 for(let n=0;;n++){
  assert.equal(child.exitCode,null,log);try{if((await fetch(origin+'/api/health')).ok)break;}catch{/* Bound local startup wait. */}
  assert.ok(n<100,log);await new Promise(r=>setTimeout(r,100));
 }
 const problemId=randomUUID(),revisionId=randomUUID();
 const response=await fetch(`${origin}/api/authored-problems/${problemId}/attribution?revisionId=${revisionId}`);
 assert.equal(response.status,200,await response.clone().text());assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('set-cookie'),null);
 assert.deepEqual(await response.json(),{problemId,revisionId,author:null});
 assert.equal((await fetch(`${origin}/api/authored-problems/${problemId}/attribution?revisionId=${revisionId}&ownerId=private`)).status,400);
 console.log('PASS built default-off attribution: neutral private/no-store response, no cookie, invalid selectors rejected, unreachable database and no feature activation.');
}finally{child.kill('SIGTERM');await once(child,'exit');}
