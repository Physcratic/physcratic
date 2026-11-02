import assert from 'node:assert/strict';
import test from 'node:test';
import { ESLint } from 'eslint';

test('raw image exception is confined to ImageResponse entrypoints',async()=>{
  const lint=new ESLint();
  for(const file of ['app/page.tsx','app/coaching/page.tsx']) {
    const config=await lint.calculateConfigForFile(file);
    assert.equal(config.rules['@next/next/no-img-element'][0],1);
  }
  for(const file of ['app/opengraph-image.tsx','app/coaching/opengraph-image.tsx',
    'app/learn/opengraph-image.tsx','app/learn/[slug]/opengraph-image.tsx',
    'app/dashboard/problems/[id]/opengraph-image.tsx']) {
    const config=await lint.calculateConfigForFile(file);
    assert.equal(config.rules['@next/next/no-img-element'][0],0);
  }
});
