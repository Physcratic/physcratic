import test from 'node:test';
test('upgrade package, canonical ledger and replay guards',async()=>{const {packageCheck}=await import('../scripts/production-upgrade/core-checks.mjs');await packageCheck();});
test('exact target and explicit bounded approvals',async()=>{const {targetCheck}=await import('../scripts/production-upgrade/core-checks.mjs');targetCheck();});
test('B6 accepts only PostgreSQL 18.7 catalog identity',async()=>{const {versionCheck}=await import('../scripts/production-upgrade/core-checks.mjs');await versionCheck();});
