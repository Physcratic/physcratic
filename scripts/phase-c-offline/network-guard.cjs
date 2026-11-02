// Defense in depth for audited offline tests, not a hostile-code sandbox.
const net = require('node:net');
const tls = require('node:tls');
const dns = require('node:dns');
const dgram = require('node:dgram');
const child = require('node:child_process');
const allowedPort = Number(process.env.PHASE_C_LOCAL_PORT || 0);
const tsxParentPath = require('node:path').join(require('node:os').tmpdir(),
  `tsx-${process.geteuid ? process.geteuid() : require('node:os').userInfo().username}`, `${process.ppid}.pipe`);
const tsxParentPipe = process.platform === 'win32' ? '\\\\?\\pipe\\' + tsxParentPath : tsxParentPath;
function reject() { throw new Error('PHASE_C_NETWORK_BLOCKED: only the owned loopback PostgreSQL port is permitted'); }
function endpoint(args) {
  let o = args[0];
  if (Array.isArray(o)) return endpoint(o);
  if (typeof o === 'object' && o !== null) {
    if (o.path) return {path:o.path};
    return {host:o.host || o.hostname || 'localhost',port:Number(o.port)};
  }
  if (typeof o === 'string' && !/^\d+$/.test(o)) return {path:o};
  return {host:typeof args[1] === 'string' ? args[1] : 'localhost',port:Number(o)};
}
function check(args) {
  const e = endpoint(args);
  // tsx and Node use local Windows named pipes / Unix sockets for IPC.
  if (e.path) {
    if (e.path === tsxParentPipe) return;
    return reject();
  }
  if (e.host !== '127.0.0.1' || e.port !== allowedPort || e.port === 0) reject();
}
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args) { check(args); return connect.apply(this,args); };
const secure=tls.connect;
tls.connect=function(...args) { check(args); return secure.apply(this,args); };
dns.lookup=function(host, ...args) {
  if (host !== '127.0.0.1') reject();
  const cb=args.at(-1); if(typeof cb === 'function') return queueMicrotask(()=>cb(null,'127.0.0.1',4));
  reject();
};
for (const name of Object.keys(dns)) if (/^(resolve|reverse)/.test(name) && typeof dns[name] === 'function') dns[name]=reject;
for (const name of Object.keys(dns.promises)) if (/^(resolve|reverse)/.test(name)) dns.promises[name]=reject;
dns.promises.lookup=async host=>{if(host!=='127.0.0.1')reject();return {address:host,family:4};};
dgram.createSocket=reject;
// Prevent native subprocesses from escaping the Node transport guard. Node
// children retain NODE_OPTIONS. PG native lifecycle is owned by run.py.
for (const name of ['spawn','spawnSync','execFile','execFileSync']) {
  const original=child[name];
  child[name]=function(file,...args) {
    const path=require('node:path');
    const resolved=path.resolve(String(file)).toLowerCase();
    const esbuild=resolved.startsWith(path.resolve(__dirname,'../../node_modules').toLowerCase()+path.sep) && /[\\/]esbuild(?:\.exe)?$/.test(resolved);
    if(resolved!==path.resolve(process.execPath).toLowerCase() && !esbuild) reject();
    for(const value of args) if(value && !Array.isArray(value) && typeof value==='object' && (value.shell || value.detached || (value.env && value.env.NODE_OPTIONS!==process.env.NODE_OPTIONS))) reject();
    return original.call(this,file,...args);
  };
}
const fork=child.fork;
child.fork=function(modulePath,args,options) {
  const value=Array.isArray(args) ? options : (args && typeof args==='object' ? args : options);
  if(value && (value.shell || value.detached ||
      (value.env && value.env.NODE_OPTIONS!==process.env.NODE_OPTIONS) ||
      (value.execPath && require('node:path').resolve(value.execPath)!==require('node:path').resolve(process.execPath)))) reject();
  return fork.call(this,modulePath,args,options);
};
child.exec=child.execSync=reject;
require('node:module').syncBuiltinESMExports();

// Pure decision hook: safety tests inspect rejected paths without opening them.
module.exports = { check };
