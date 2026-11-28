import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { caseRecordSha256, readCaseRecord, writeCaseRecord } from '../scripts/account-deletion-authorization/case-record.mjs';

test('erasure case requires bounded authenticated custody and an explicit Tally review', () => {
  const directory = mkdtempSync(join(tmpdir(), 'synthetic-case-'));
  const recordPath = join(directory, 'case.enc');
  const primary = join(directory, 'primary.key');
  const backup = join(directory, 'recovered.key');
  const subjectFingerprint = 'a'.repeat(64);
  const emailSha256 = 'b'.repeat(64);
  const record = {
    kind: 'account-deletion-arm-intent-v2',
    subject: 'synthetic-private-subject',
    scopeSha256: 'c'.repeat(64),
    scope: {
      subjectFingerprint, emailSha256, publications: [],
      paths: [{ provider: 'author', pathname: 'author-media/synthetic/held', held: true, hold_sha256: 'd'.repeat(64) }],
      tallyReferences: ['award-1'],
    },
    tallyReview: {
      subjectFingerprint, emailSha256, reference: 'review-1',
      submissions: [
        { id: 'award-1', kind: 'awarded', dispositionRef: 'pending-1' },
        { id: 'unawarded-2', kind: 'unawarded', dispositionRef: 'pending-2' },
      ],
    },
  };
  const bytes = (value = record) => Buffer.from(JSON.stringify(value));
  try {
    const key = randomBytes(32);
    writeFileSync(primary, key, { mode: 0o600 });
    writeFileSync(backup, key, { mode: 0o600 });
    assert.throws(() => writeCaseRecord(join(directory, 'missing', 'case.enc'), primary, bytes()));
    assert.throws(() => writeCaseRecord(recordPath, primary, bytes({ ...record, tallyReview: {
      ...record.tallyReview, submissions: record.tallyReview.submissions.slice(1),
    } })), /Tally review is incomplete/);
    assert.throws(() => writeCaseRecord(recordPath, primary, bytes({ ...record, tallyReview: {
      ...record.tallyReview, emailSha256: 'e'.repeat(64),
    } })), /Tally review is incomplete/);
    const digest = writeCaseRecord(recordPath, primary, bytes());
    assert.throws(() => writeCaseRecord(recordPath, primary, bytes()), { code: 'EEXIST' });
    const encrypted = readFileSync(recordPath);
    assert.equal(encrypted.includes(Buffer.from('unawarded-2')), false);
    assert.equal(encrypted.includes(Buffer.from(record.subject)), false);
    rmSync(primary);
    assert.deepEqual(readCaseRecord(recordPath, backup, digest), record);
    assert.throws(() => readCaseRecord(recordPath, primary, digest), { code: 'ENOENT' });
    writeFileSync(primary, randomBytes(32));
    assert.throws(() => readCaseRecord(recordPath, primary, digest), /recovered key could not be verified/);
    encrypted[encrypted.length - 1] ^= 1;
    writeFileSync(recordPath, encrypted);
    assert.throws(() => readCaseRecord(recordPath, backup, digest), /checksum mismatch/);
    assert.throws(() => readCaseRecord(recordPath, backup, caseRecordSha256(encrypted)), /recovered key could not be verified/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
