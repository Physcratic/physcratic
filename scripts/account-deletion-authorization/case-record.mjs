import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { closeSync, fsyncSync, openSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const header = Buffer.from('Physcratic erasure case v2\n');
const maxBytes = 512 * 1024;
const nonceBytes = 12;
const tagBytes = 16;
const sha = /^[a-f0-9]{64}$/;
const submissionId = /^[A-Za-z0-9_-]{1,100}$/;
const reference = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 256;
export const caseRecordSha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function readBounded(path, limit) {
  const file = statSync(path);
  if (!file.isFile() || file.size > limit) throw new Error('Invalid case file');
  const bytes = readFileSync(path);
  if (bytes.length > limit) throw new Error('Invalid case file');
  return bytes;
}

function parseRecord(bytes) {
  const record = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  const { scope, tallyReview } = record;
  if (record.kind !== 'account-deletion-arm-intent-v2'
    || !sha.test(record.scopeSha256 ?? '')
    || !sha.test(scope?.subjectFingerprint ?? '')
    || !sha.test(scope?.emailSha256 ?? '')
    || !Array.isArray(scope?.publications) || !Array.isArray(scope?.paths)
    || !scope.paths.every(p => typeof p?.held === 'boolean'
      && (p.held ? sha.test(p.hold_sha256 ?? '') : p.hold_sha256 === null))
    || !Array.isArray(scope?.tallyReferences)
    || tallyReview?.subjectFingerprint !== scope.subjectFingerprint
    || tallyReview?.emailSha256 !== scope.emailSha256
    || !reference(tallyReview?.reference) || !Array.isArray(tallyReview?.submissions)
    || !tallyReview.submissions.every(s => typeof s?.id === 'string' && submissionId.test(s.id)
      && ['awarded', 'unawarded'].includes(s.kind) && reference(s.dispositionRef))
    || new Set(tallyReview.submissions.map(s => s.id)).size !== tallyReview.submissions.length
    || scope.tallyReferences.length !== tallyReview.submissions.filter(s => s.kind === 'awarded').length
    || !scope.tallyReferences.every(id => tallyReview.submissions.some(s => s.id === id && s.kind === 'awarded'))) {
    throw new Error('Case scope or Tally review is incomplete');
  }
  return record;
}

function readKey(path) {
  const key = readBounded(path, 32);
  if (key.length !== 32) {
    key.fill(0);
    throw new Error('A recovered 32-byte case key is required');
  }
  return key;
}

export function readCaseRecord(path, keyPath, expectedSha256) {
  const bytes = readBounded(path, maxBytes + header.length + nonceBytes + tagBytes);
  const body = header.length + nonceBytes + tagBytes;
  if (bytes.length <= body || !bytes.subarray(0, header.length).equals(header)
    || !sha.test(expectedSha256 ?? '') || caseRecordSha256(bytes) !== expectedSha256) {
    throw new Error('External arm intent checksum mismatch');
  }
  const key = readKey(keyPath);
  let plaintext;
  try {
    const cipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(header.length, header.length + nonceBytes));
    cipher.setAAD(header);
    cipher.setAuthTag(bytes.subarray(header.length + nonceBytes, body));
    plaintext = Buffer.concat([cipher.update(bytes.subarray(body)), cipher.final()]);
    return parseRecord(plaintext);
  } catch {
    throw new Error('Encrypted case or recovered key could not be verified');
  } finally {
    key.fill(0);
    plaintext?.fill(0);
  }
}

export function writeCaseRecord(path, keyPath, plaintext) {
  if (plaintext.length > maxBytes) throw new Error('Case record is too large');
  parseRecord(plaintext);
  const key = readKey(keyPath);
  let bytes;
  try {
    const nonce = randomBytes(nonceBytes);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    cipher.setAAD(header);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    bytes = Buffer.concat([header, nonce, cipher.getAuthTag(), encrypted]);
  } finally {
    key.fill(0);
  }
  // A partial write cannot be armed. Never replace a prior or uncertain intent.
  const fd = openSync(path, 'wx', 0o600);
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  const digest = caseRecordSha256(bytes);
  readCaseRecord(path, keyPath, digest);
  return digest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [action, path, keyPath, digest] = process.argv.slice(2);
  try {
    if (action === 'seal' && path && keyPath && !digest) {
      const bytes = readFileSync(0);
      try {
        console.log(writeCaseRecord(path, keyPath, bytes));
      } finally {
        bytes.fill(0);
      }
    } else if (['read', 'verify'].includes(action) && path && keyPath && digest) {
      const record = readCaseRecord(path, keyPath, digest);
      console.log(action === 'read' ? JSON.stringify(record) : `CASE_CUSTODY_VERIFIED ${digest}`);
    } else {
      throw new Error('Invalid case record command');
    }
  } catch {
    console.error('Case record could not be persisted or verified. Preserve existing evidence.');
    process.exitCode = 1;
  }
}
