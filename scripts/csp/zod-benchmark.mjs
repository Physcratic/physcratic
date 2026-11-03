// Fresh processes prevent Zod's cached allowsEval and global config leaking
// between variants. Diagnostic microbenchmark, not a browser latency estimate.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
const mode = process.argv[2];
if (!mode) {
  for (const variant of ['jit', 'jitless', 'denied']) {
    const args = [...(variant === 'denied' ? ['--disallow-code-generation-from-strings'] : []), import.meta.filename, variant];
    const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    console.log(run.stdout.trim());
  }
} else {
  if (mode === 'jitless') z.config({ jitless: true });
  const schema = z.object({ id: z.uuid(), title: z.string().min(1).max(160), tags: z.array(z.string()).max(20), points: z.number().int().min(0).max(100), content: z.array(z.object({ kind: z.literal('text'), text: z.string().max(10000) })) });
  const input = { id: '00000000-0000-4000-8000-000000000001', title: 'Local diagnostic fixture', tags: ['mechanics'], points: 8, content: [{ kind: 'text', text: 'A fixed synthetic problem statement.' }] };
  assert.deepEqual(schema.parse(input), input);
  for (const invalid of [{ ...input, points: -1 }, { ...input, id: 'invalid' }, { ...input, content: [{ kind: 'image' }] }]) assert.equal(schema.safeParse(invalid).success, false);
  const samples = [];
  for (let round = 0; round < 8; round++) {
    const start = performance.now();
    for (let i = 0; i < 100000; i++) schema.parse(input);
    if (round) samples.push(performance.now() - start);
  }
  samples.sort((a,b) => a-b);
  console.log(JSON.stringify({ mode, parses: 100000, medianMs: samples[3], minMs: samples[0], maxMs: samples[6], correctness: 'valid/deep equality and three invalid fixtures pass' }));
}
