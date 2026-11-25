// Check real HTTP sessions and role boundaries against the running local demo.
import assert from 'node:assert/strict';
const origin = 'http://localhost:3000';
async function request(path, options = {}) {
  return fetch(origin + path, { ...options, redirect: 'manual', signal: AbortSignal.timeout(120000) });
}
assert.equal((await request('/api/community/moderation')).status, 401, 'Guest cannot access staff data');
for (const role of ['user', 'moderator', 'admin']) {
  const response = await request('/api/auth/sign-in/email', {
    method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ email: `${role}@example.invalid`, password: 'Physcratic-demo-2026!' }),
  });
  assert.equal(response.status, 200, `${role} can sign in`);
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert.ok(cookie.includes('session_token'), 'A real session cookie is issued');
  const headers = { cookie, origin };
  const session = await (await request('/api/auth/get-session', { headers })).json();
  assert.equal(session.user.id, `local-demo-${role}`);
  const moderation = await request('/api/community/moderation', { headers });
  assert.equal(moderation.status, role === 'user' ? 403 : 200, `${role} moderation permission`);
  if (role !== 'user') assert.equal((await moderation.json()).role, role);
  const logout = await request('/api/auth/sign-out', { method: 'POST', headers });
  assert.equal(logout.status, 200);
  console.log(`${role}: sign-in, session, moderation permission and sign-out passed`);
}
