import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MedalBadge } from '../components/community/medal-badge';
import { AchievementShowcase } from '../components/community/achievement-badge';
import { publicMedalSchema } from '../lib/community/achievements';
const medal={id:'medal:00000000-0000-4000-8000-000000000001',competition:'IPhO' as const,year:2025,country:'ID',competitionName:''};
test('medal labels put the award first and keep full competition details in the disclosure',()=>{
 const examples = [
  ['gold', 'IPhO', 2026, 'Gold IPhO 2026'],
  ['silver', 'APhO', 2025, 'Silver APhO 2025'],
  ['bronze', 'EuPhO', 2024, 'Bronze EuPhO 2024'],
  ['bronze', 'National', 2026, 'Bronze National ID 2026'],
  ['honourable-mention', 'IPhO', 2026, 'Honourable Mention IPhO 2026'],
 ] as const;
 for (const [award,competition,year,label] of examples) {
  const competitionName = competition === 'National' ? 'Indonesian Physics Olympiad' : '';
  const html = renderToStaticMarkup(React.createElement(MedalBadge,{medal:{...medal,award,competition,year,competitionName}}));
  assert.ok(html.includes(`aria-label="${label}: medal details"`));
  assert.ok(html.includes(`<span class="break-words">${label}</span></summary>`));
  if (competitionName) {
   assert.ok(html.includes('Verified Bronze, Indonesian Physics Olympiad, 2026, ID. Certificate reviewed privately.'));
   assert.ok(!html.split('</summary>')[0].includes(competitionName));
  }
 }
 assert.equal(publicMedalSchema.safeParse({...medal,award:'gold',certificateName:'private'}).success,false);
});
test('the shared rendering limit and ordering include medals and earned badges',()=>{
 const html=renderToStaticMarkup(React.createElement(AchievementShowcase,{ids:[medal.id,'first-spark','problem-weaver'],medals:[{...medal,award:'bronze'}]}));assert.ok(html.indexOf('Bronze')<html.indexOf('First Spark'));assert.ok(!html.includes('Problem Weaver'));assert.equal((html.match(/<summary/g)||[]).length,2);
});
