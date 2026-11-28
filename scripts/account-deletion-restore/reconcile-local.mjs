import { createHash, createPublicKey, verify } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { readCaseRecord } from '../account-deletion-authorization/case-record.mjs';

const database = 'physcratic_restore_test';
const hex = /^[a-f0-9]{64}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const providers = {
  author: /^(author-media|solution-evidence)\/[A-Za-z0-9/_.-]+$/,
  profile: /^community-profile-media\/[a-f0-9-]{36}\.webp$/,
  medal: /^community-medal-proof\/[a-f0-9-]{36}\.pdf$/,
};
const errors = [
  'Restore database is not isolated',
  'Installed erasure revision is not reviewed',
  'Account erasure foreign keys differ from the reviewed fixture',
  'Erasure authorization is outside its approved window',
  'Authorized restored account does not match',
  'Existing reconciliation receipt conflicts with restored account',
  'Restored authorization differs from independent approval',
  'Restored permit fence is missing or differs from approval',
  'Continuing publication rights differ from independent approval',
  'Expected cleanup obligation or upload hold is absent',
  'Operator-approved deletion policy is missing',
  'Mixed evidence requires adjudication',
  'Evidence changed during review',
  'Evidence review changed',
  'Erasure did not commit the expected database state',
  'canceling statement due to lock timeout',
  'canceling statement due to statement timeout',
];

function requireCondition(ok, message) {
  if (!ok) throw new Error(message);
}

function readBounded(path, limit) {
  const info = statSync(path);
  requireCondition(info.isFile() && info.size <= limit, 'Invalid approval file');
  const bytes = readFileSync(path);
  requireCondition(bytes.length <= limit, 'Invalid approval file');
  return bytes;
}

function shape(object, keys) {
  return object && typeof object === 'object' && !Array.isArray(object)
    && Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object, key));
}

function matches(pattern, value) {
  return typeof value === 'string' && pattern.exec(value)?.[0] === value;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function localDocker(args, input) {
  const env = { PATH: process.env.PATH };
  return spawnSync('docker', ['--host=unix:///var/run/docker.sock', ...args], {
    env, input, timeout: 45_000, maxBuffer: 128 * 1024, encoding: 'utf8',
  });
}

function main() {
  const [containerId, approvalPath, signaturePath, publicKeyPath, trustedKeyDigest, intentPath, caseKeyPath] = process.argv.slice(2);
  requireCondition([7, 9].includes(process.argv.length) && matches(hex, containerId) && matches(hex, trustedKeyDigest),
    'Usage: node reconcile-local.mjs CONTAINER_ID APPROVAL.json APPROVAL.sig REVIEWER.pub TRUSTED_KEY_SHA256 [ENCRYPTED_INTENT RECOVERED_CASE_KEY]');
  const publicKey = readBounded(publicKeyPath, 4096);
  requireCondition(sha256(publicKey) === trustedKeyDigest, 'Reviewer public key fingerprint mismatch');
  const key = createPublicKey(publicKey);
  const bytes = readBounded(approvalPath, 128 * 1024);
  const signature = readBounded(signaturePath, 64);
  requireCondition(key.asymmetricKeyType === 'ed25519' && signature.length === 64
    && verify(null, bytes, key, signature), 'Independent approval signature is invalid');
  const a = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  const baseKeys = ['version', 'caseId', 'deletionRecord', 'approvedAt', 'expiresAt', 'containerId',
    'database', 'subjectId', 'subjectFingerprint', 'publications', 'cleanup'];
  const legacy = a?.version === 1;
  const targetKeys = [...baseKeys, 'databaseOid', 'targetRevision', 'recoveryPermitEpoch', 'sourceAuthorization', 'tallyReferences'];
  requireCondition((legacy ? !intentPath && shape(a, baseKeys) : a?.version === 2 && !!intentPath && !!caseKeyPath && shape(a, targetKeys))
    && matches(uuid, a.caseId)
    && matches(/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/, a.deletionRecord)
    && matches(/^synthetic-[A-Za-z0-9-]{1,100}$/, a.subjectId) && matches(hex, a.subjectFingerprint)
    && a.containerId === containerId && a.database === database, 'Approval does not match the disposable target or schema');
  const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  const start = Date.parse(a.approvedAt);
  const end = Date.parse(a.expiresAt);
  const now = Date.now();
  requireCondition(matches(utc, a.approvedAt) && matches(utc, a.expiresAt)
    && start <= now && now < end && end - start <= 86_400_000, 'Erasure authorization is outside its approved window');
  requireCondition(Array.isArray(a.publications) && a.publications.length <= 1000
    && a.publications.every(p => shape(p, ['problemId', 'revisionId', 'digest']) && matches(uuid, p.problemId)
      && matches(uuid, p.revisionId) && matches(hex, p.digest))
    && new Set(a.publications.map(p => p.problemId)).size === a.publications.length,
  'Invalid publication approval inventory');
  requireCondition(Array.isArray(a.cleanup) && a.cleanup.length <= 1000
    && a.cleanup.every(o => shape(o, ['provider', 'pathname', 'held']) && typeof o.provider === 'string'
      && Object.hasOwn(providers, o.provider)
      && matches(providers[o.provider], o.pathname) && o.pathname.length <= 512 && !o.pathname.includes('..')
      && typeof o.held === 'boolean')
    && new Set(a.cleanup.map(o => o.provider + ':' + o.pathname)).size === a.cleanup.length,
  'Invalid cleanup approval inventory');

  if (!legacy) {
    const provenance = a.sourceAuthorization;
    requireCondition(Number.isInteger(a.databaseOid) && a.databaseOid > 0 && a.databaseOid <= 4294967295
      && ['0026', '0027'].includes(a.targetRevision)
      && (a.targetRevision === '0027' ? matches(uuid, a.recoveryPermitEpoch) : a.recoveryPermitEpoch === null)
      && Array.isArray(a.tallyReferences) && a.tallyReferences.length <= 1000
      && a.tallyReferences.every(id => matches(/^[A-Za-z0-9_-]{1,100}$/, id))
      && new Set(a.tallyReferences).size === a.tallyReferences.length
      && shape(provenance, ['caseId', 'intentSha256', 'outcome', 'evidenceRef', 'decision']) && matches(uuid, provenance.caseId)
      && provenance.caseId !== a.caseId && matches(hex, provenance.intentSha256)
      && ['receipt-confirmed', 'arming-unknown', 'execution-unknown'].includes(provenance.outcome)
      && matches(/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/, provenance.evidenceRef)
      && provenance.decision === (provenance.outcome === 'receipt-confirmed' ? 'reconcile-confirmed' : 'adjudicated-reapply'),
    'Invalid source authorization or target binding');
    const intent = readCaseRecord(intentPath, caseKeyPath, provenance.intentSha256);
    requireCondition(intent.caseId === provenance.caseId
      && intent.subject === a.subjectId && matches(hex, intent.scopeSha256)
      && intent.scope.subjectFingerprint === a.subjectFingerprint
      && matches(uuid, intent.scope.permitEpoch) && intent.scope.permitEpoch !== a.recoveryPermitEpoch
      && intent.scope.publications.length <= 1000
      && intent.scope.publications.every(p => matches(uuid, p?.id))
      && intent.tallyReview.submissions.every(s => a.tallyReferences.includes(s.id))
      && [intent.authorizationRef, intent.dispositionRef, intent.custodyRef].every(v => typeof v === 'string' && v.trim().length > 0 && v.length <= 256)
      && Number.isFinite(Date.parse(intent.recordedUtc)) && Date.parse(intent.recordedUtc) <= start
      && Date.parse(intent.expiresUtc) > Date.parse(intent.recordedUtc)
      && Date.parse(intent.expiresUtc) - Date.parse(intent.recordedUtc) <= 86_400_000,
    'External arm intent and signed approval differ');
    a.verifiedIntentScopeSha256 = intent.scopeSha256;
    a.verifiedIntentProblemIds = intent.scope.publications.map(p => p.id);
    a.verifiedIntentHolds = intent.scope.paths.filter(p => p.held)
      .map(({ provider, pathname }) => ({ provider, pathname }));
    requireCondition(a.verifiedIntentHolds.every(p => !a.cleanup.some(o =>
      o.provider === p.provider && o.pathname === p.pathname && !o.held)),
    'Restored authorization differs from independent approval');
  }

  const read = localDocker(['inspect', '--type=container', containerId]);
  requireCondition(read.status === 0, 'Disposable container is unavailable on the local Docker socket');
  const [target] = JSON.parse(read.stdout);
  const host = target?.HostConfig;
  const networks = Object.keys(target?.NetworkSettings?.Networks ?? {});
  requireCondition(target?.Id === containerId && target.State.Running && target.Config.Image === 'postgres:18.7-alpine'
    && target.Config.Labels?.['io.physcratic.purpose'] === 'disposable-erasure-restore'
    && host.AutoRemove && !host.Privileged && host.NetworkMode === 'none'
    && networks.length === 1 && networks[0] === 'none' && !host.PublishAllPorts
    && Object.keys(host.PortBindings ?? {}).length === 0 && !host.Binds?.length
    && !host.Mounts?.length && !host.VolumesFrom?.length
    && target.Mounts.every(mount => mount.Type === 'volume' && mount.Destination === '/var/lib/postgresql'),
  'Container is not a network-isolated disposable restore target');

  const sql = readFileSync(new URL('reconcile-local.sql', import.meta.url), 'utf8');
  const nonce = sha256(Buffer.concat([Buffer.from('physcratic-local-erasure-v1\0'), bytes]));
  // Deliver the signed input over stdin, outside shell arguments and psql diagnostics.
  const input = `\\set approved_document ${Buffer.from(JSON.stringify(a)).toString('base64')}\n\\set approved_nonce ${nonce}\n${sql}`;
  const result = localDocker(['exec', '-i', containerId, 'psql', '-X', '-w', '-qAt',
    '-h', '/var/run/postgresql', '-U', 'postgres', '-d', database, '-f', '-'], input);
  if (result.status !== 0) {
    const messages = (result.stderr ?? '').split('\n').map(line => line.split('ERROR:  ')[1]);
    const diagnostic = errors.find(error => messages.includes(error));
    throw new Error(diagnostic ?? 'Local PostgreSQL reconciliation failed. Check the isolated target before retrying');
  }
  const outcome = result.stdout.trim();
  requireCondition(outcome === 'RECONCILED' || outcome === 'ALREADY_RECONCILED',
    'Local PostgreSQL did not confirm the outcome. Retry the same signed approval');
  console.log(outcome);
}

try {
  main();
} catch (error) {
  // File paths and data parsed from the approval are intentionally omitted from errors.
  console.error(error.code || error instanceof SyntaxError ? 'Cannot read the local approval or target' : error.message);
  process.exitCode = 1;
}
