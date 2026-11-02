import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { tmpdir, userInfo } from 'node:os';
import path from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { once } from 'node:events';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import dgram from 'node:dgram';
import { fork, spawn, spawnSync } from 'node:child_process';
test('remote and unowned loopback transports fail before connecting',()=>{
  for(const host of ['example.invalid','integration.physcratic.com','physcratic.com','localhost','127.0.0.2','::1']) {
    assert.throws(()=>net.connect({host,port:5432}),/PHASE_C_NETWORK_BLOCKED/);
    assert.throws(()=>tls.connect({host,port:443}),/PHASE_C_NETWORK_BLOCKED/);
  }
  assert.throws(()=>net.connect({host:'127.0.0.1',port:443}),/PHASE_C_NETWORK_BLOCKED/);
  assert.throws(()=>dns.lookup('example.invalid',()=>{}),/PHASE_C_NETWORK_BLOCKED/);
  assert.throws(()=>dns.resolve('example.invalid',()=>{}),/PHASE_C_NETWORK_BLOCKED/);
  assert.throws(()=>spawnSync(process.execPath,['-e','0'],{shell:true}),/PHASE_C_NETWORK_BLOCKED/);
  assert.throws(()=>dgram.createSocket('udp4'),/PHASE_C_NETWORK_BLOCKED/);
});
test('native command escapes and altered child environment are refused',()=>{
  assert.throws(()=>spawnSync('curl',['https://example.invalid']),/PHASE_C_NETWORK_BLOCKED/);
  assert.throws(()=>spawnSync(process.execPath,['-e','0'],{env:{}}),/PHASE_C_NETWORK_BLOCKED/);
  assert.throws(()=>fork('unused.cjs',[],{env:{}}),/PHASE_C_NETWORK_BLOCKED/);
  assert.throws(()=>fork('unused.cjs',undefined,{env:{}}),/PHASE_C_NETWORK_BLOCKED/);
  assert.throws(()=>fork('unused.cjs',[],{execPath:'curl'}),/PHASE_C_NETWORK_BLOCKED/);
});
test('child Node processes inherit the egress guard',()=>{
  const r=spawnSync(process.execPath,['-e',"require('net').connect({host:'example.invalid',port:443})"],{encoding:'utf8'});
  assert.notEqual(r.status,0); assert.match(r.stderr,/PHASE_C_NETWORK_BLOCKED/);
});

const { check } = createRequire(import.meta.url)('./network-guard.cjs');
test('only the exact current-parent tsx extended pipe is added', {skip:process.platform!=='win32'},()=>{
  const local='\\\\?\\pipe\\'+path.join(tmpdir(),`tsx-${userInfo().username}`,`${process.ppid}.pipe`);
  assert.doesNotThrow(()=>check([local]));
  for(const candidate of [local+'suffix',local.replace(`${process.ppid}.pipe`,'999999999.pipe'),
    local.replace('tsx-','tsx-other-'),
    '\\\\.\\pipe\\unrelated-local-pipe', path.join(tmpdir(),'unrelated.sock'),local.replace('\\\\?\\pipe\\','\\\\remote.invalid\\pipe\\'),
    '\\\\?\\UNC\\remote.invalid\\pipe\\test',local.replaceAll('\\','/')]) {
    assert.throws(()=>check([candidate]),/PHASE_C_NETWORK_BLOCKED/);
  }
  for(const host of ['example.invalid','127.0.0.2','::1']) {
    for(const port of [80,443,5432]) assert.throws(()=>check([{host,port}]),/PHASE_C_NETWORK_BLOCKED/);
  }
});
test('child connects to its own parent over the exact local tsx pipe', {skip:process.platform!=='win32'},async()=>{
  const pipe='\\\\?\\pipe\\'+path.join(tmpdir(),`tsx-${userInfo().username}`,`${process.pid}.pipe`);
  const server=net.createServer(socket=>socket.end('local-ipc-ok'));
  server.listen(pipe); await once(server,'listening');
  try {
    const source=`const s=require('net').connect(${JSON.stringify(pipe)});let v='';s.on('data',b=>v+=b);s.on('end',()=>process.exit(v==='local-ipc-ok'?0:2));s.on('error',()=>process.exit(3));`;
    const child=spawn(process.execPath,['-e',source],{stdio:'pipe'});
    const [code]=await once(child,'exit'); assert.equal(code,0);
  } finally { await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())); }
});

// A real fetch attempt in an owned child must fail inside the Node guard.
test('HTTP and HTTPS cannot escape through fetch',()=>{
  for (const scheme of ['http','https']) {
    const source=`fetch('${scheme}://example.invalid/').then(()=>process.exit(2)).catch(e=>process.exit(String(e.cause).includes('PHASE_C_NETWORK_BLOCKED')?0:3));`;
    const result=spawnSync(process.execPath,['-e',source],{encoding:'utf8',timeout:10000});
    assert.equal(result.status,0,result.stderr);
  }
});

test('forked Node retains the guard while local IPC still works', {timeout:10000},async(t)=>{
  const dir=mkdtempSync(path.join(tmpdir(),'phase-c-fork-'));
  const file=path.join(dir,'fixture.cjs');
  writeFileSync(file,"try{require('net').connect({host:'example.invalid',port:443});process.send('escaped')}catch(e){process.send(e.message.startsWith('PHASE_C_NETWORK_BLOCKED')?'blocked':'unknown',()=>process.exit(0))}");
  const child=fork(file,[],{stdio:['ignore','ignore','pipe','ipc']});
  t.after(()=>{if(child.exitCode===null)child.kill();rmSync(dir,{recursive:true,force:true});});
  const exited=once(child,'exit');
  const [message]=await once(child,'message');
  assert.equal(message,'blocked');
  const [code]=await exited;assert.equal(code,0);
});
