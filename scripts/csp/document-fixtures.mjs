// Synthetic session dependency for detached document tests only. This does not
// qualify Better Auth login, staff grants, database state or provider readiness.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {tmpdir} from 'node:os';
export async function installDocumentFixtures(root) {
  assert.ok(root.startsWith(join(tmpdir(), 'physcratic-x3c-')));
  await writeFile(resolve(root, 'lib/csp-original-auth.ts'), await readFile(resolve(root, 'lib/auth.ts')));
  await writeFile(resolve(root, 'lib/auth.ts'), `// DETACHED SYNTHETIC FIXTURE ONLY
import {auth as original} from './csp-original-auth';
const getSession: typeof original.api.getSession = (async (input: Parameters<typeof original.api.getSession>[0]) => {
 if(process.env.CSP_DOCUMENT_FIXTURES!=='synthetic-only') return original.api.getSession(input);
 const state=new Headers(input?.headers).get('x-csp-document-fixture');
 if(!state || state==='anonymous') return null;
 if(state==='error') throw new Error('Synthetic session failure');
 return {user:{id:'synthetic-csp-user',name:'Synthetic CSP user',email:'csp@example.invalid',emailVerified:state!=='unverified',createdAt:new Date(0),updatedAt:new Date(0)},session:{id:'synthetic-session',token:'synthetic',userId:'synthetic-csp-user',expiresAt:new Date('2099-01-01'),createdAt:new Date(0),updatedAt:new Date(0)}};
}) as typeof original.api.getSession;
export const auth={...original,api:{...original.api,getSession}};
`);
}
export async function documentFixtureEnvironment(root) {
  assert.ok(root.startsWith(join(tmpdir(), 'physcratic-x3c-')), 'Only detached document fixtures may enable synthetic gates');
  assert.match(await readFile(resolve(root, 'lib/auth.ts'), 'utf8'), /DETACHED SYNTHETIC FIXTURE ONLY/);
  return {CSP_DOCUMENT_FIXTURES:'synthetic-only', COMMUNITY_STAFF_ENABLED:'true', COMMUNITY_MEDALS_ENABLED:'true',
    COMMUNITY_VERIFICATION_UI_ENABLED:'true', COMMUNITY_MODERATION_ENABLED:'true', COMMUNITY_MODERATION_UI_ENABLED:'true'};
}
