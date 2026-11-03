// Preloaded ONLY by the local CSP harness, including Next's worker processes.
// No remote service credentials are passed to these children. Deny DNS/network
// destinations even if a Server Component tries to contact an integration.
const net = require('node:net');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  // net.connect passes an already-normalized argument array to Socket.connect.
  const options = Array.isArray(args[0]) ? args[0][0] : net._normalizeArgs(args)[0];
  if (!options.path && !['127.0.0.1', '::1', 'localhost'].includes(options.host || 'localhost')) {
    throw new Error('CSP harness denied non-loopback socket');
  }
  return connect.apply(this, args);
};
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)) {
    throw new Error('CSP harness denied non-loopback fetch');
  }
  return originalFetch(input, { ...init, redirect: 'error' });
};
