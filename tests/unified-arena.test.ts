import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {UnifiedProblemCard} from '../components/physics/unified-arena-collection';
import {collectionEntrySchema} from '../lib/unified-arena';
test('shared cards preserve readers, publisher, public author badges and source rights',()=>{
 const internal=renderToStaticMarkup(React.createElement(UnifiedProblemCard,{problem:{key:'arena:arena-mind-the-gap',kind:'arena',id:'arena-mind-the-gap',title:'Mind the Gap',tags:[],summary:'Original',elo:1350,estimatedDifficulty:null,author:null}}));assert.ok(internal.includes('/dashboard/problems/arena-mind-the-gap'));assert.ok(internal.includes('Published by Physcratic'));
 const entry=collectionEntrySchema.parse({key:'authored:00000000-0000-4000-8000-000000000001',kind:'authored',id:'00000000-0000-4000-8000-000000000001',title:'<script>unsafe</script>',tags:['Mechanics'],summary:'Published',estimatedDifficulty:'Intermediate',author:{handle:'public_author',displayName:'Public author',selectedIds:['first-spark','problem-weaver']},provenance:{kind:'authorized',source:'Original source',rightsDeclaration:'With permission'}});
 const html=renderToStaticMarkup(React.createElement(UnifiedProblemCard,{problem:entry}));assert.ok(html.includes('/dashboard/authored/'+entry.id));assert.ok(html.includes('/u/public_author'));assert.ok(html.includes('First Spark'));assert.ok(html.includes('Problem Weaver'));assert.ok(html.includes('Original source'));assert.ok(html.includes('With permission'));assert.ok(!html.includes('<script>unsafe'));
 const privateHtml=renderToStaticMarkup(React.createElement(UnifiedProblemCard,{problem:{...entry,author:null}}));assert.ok(privateHtml.includes('Community author'));assert.ok(!privateHtml.includes('/u/public_author'));
});
