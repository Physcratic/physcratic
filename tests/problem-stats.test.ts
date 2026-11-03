import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {statsKeysSchema,favouriteWriteSchema,statsPageSchema} from '../lib/community/problem-stats-contracts';
import {ProblemStatsControl} from '../components/community/problem-stats';
test('favourite contracts bind explicit desired state and reject foreign selectors and unbounded batches',()=>{
 const key='arena:arena-mind-the-gap';assert.ok(favouriteWriteSchema.safeParse({key,favourite:true}).success);
 for(const v of [{key},{key,favourite:'true'},{key,favourite:true,userId:'other'},{key:'arena:fake',favourite:true}])assert.ok(!favouriteWriteSchema.safeParse(v).success);
 for(const v of [[],[key,key],Array(25).fill(key)])assert.ok(!statsKeysSchema.safeParse(v).success);
 assert.ok(!statsPageSchema.safeParse({problems:[{key,favourites:0,favourite:false,solves:0,userIds:['private']}]}).success);
 assert.equal(renderToStaticMarkup(React.createElement(ProblemStatsControl,{problemKey:key})), '');
});
