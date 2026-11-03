import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MedalBadge } from '../components/community/medal-badge';
import { AchievementShowcase } from '../components/community/achievement-badge';
import { publicMedalSchema } from '../lib/community/achievements';
import { awardLabels } from '../lib/community/medal-client';
const medal={id:'medal:00000000-0000-4000-8000-000000000001',competition:'IPhO' as const,year:2025,country:'ID',competitionName:''};
test('medal labels distinguish every award and contain no certificate fields',()=>{
 for(const award of ['gold','silver','bronze','honourable-mention'] as const){const html=renderToStaticMarkup(React.createElement(MedalBadge,{medal:{...medal,award}}));assert.ok(html.includes(awardLabels[award]));assert.ok(html.includes('2025'));assert.ok(html.includes('<summary'));if(award==='honourable-mention')assert.ok(!html.includes('Gold'));}
 assert.equal(publicMedalSchema.safeParse({...medal,award:'gold',certificateName:'private'}).success,false);
});
test('the shared rendering limit and ordering include medals and earned badges',()=>{
 const html=renderToStaticMarkup(React.createElement(AchievementShowcase,{ids:[medal.id,'first-spark','problem-weaver'],medals:[{...medal,award:'bronze'}]}));assert.ok(html.indexOf('Bronze')<html.indexOf('First Spark'));assert.ok(!html.includes('Problem Weaver'));assert.equal((html.match(/<summary/g)||[]).length,2);
});
