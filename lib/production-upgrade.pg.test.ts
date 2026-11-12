import test from 'node:test';
import assert from 'node:assert/strict';
const url=process.env.AUTHORING_TEST_DATABASE_URL;
test('reviewed noncontiguous Production upgrade on synthetic loopback PostgreSQL only',{skip:!url},async()=>{
 const {rehearse}=await import('../scripts/production-upgrade/rehearse.mjs');
 const result=await rehearse(url);
 assert.equal(result.status,'PASS');
 console.log(JSON.stringify(result));
});
