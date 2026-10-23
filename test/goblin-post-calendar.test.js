import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceGoblin,goblinPostChance} from '../src/goblin-mentor.js';
import {goblinPublicPosts} from '../src/goblin-profile-view.js';
import {GOBLIN_ID} from '../src/goblin-catalog.js';
test('ordinary publications are silent for 21 full days and then gain five percentage points per day',()=>{
 assert.deepEqual([0,1,20,21,22,23,40,41,42].map(goblinPostChance),[0,0,0,0,5,10,95,100,100]);let s=advanceGoblin(createVirtualPcState(),480).state;const initial=s.social.goblin.posts.length;s=advanceGoblin(s,21*1440+1439).state;assert.equal(s.social.goblin.posts.length,initial);s=advanceGoblin(s,41*1440+1439).state;assert.equal(s.social.goblin.posts.length,initial+1);const post=s.social.goblin.posts.at(-1);assert.ok(post.at%1440>0);assert.equal(s.social.goblin.lastPostDay,Math.floor(post.at/1440));
 assert.deepEqual(advanceGoblin(s,41*1440+1439).state.social.goblin.posts,s.social.goblin.posts);
});
test('battle audio appears after a round result without changing the ordinary post clock',()=>{
 const s=advanceGoblin(createVirtualPcState(),480).state,clock=s.social.goblin.lastPostDay;s.trackVersions.byId.work={id:'work',name:'Не переключай'};s.battleHistory.entries=[{id:'submitted',participantId:GOBLIN_ID,battleId:'makarevich-1',roundId:'selection',status:'submitted',trackVersionId:'work',occurredAt:600}];
 assert.equal(goblinPublicPosts(s,900).some(p=>p.trackVersionId==='work'),false);s.socialRuntime.events.push({id:'round-finished',type:'round-result',battleId:'makarevich-1',roundId:'selection',dueAt:1000});assert.equal(goblinPublicPosts(s,999).some(p=>p.trackVersionId==='work'),false);assert.equal(goblinPublicPosts(s,1000).find(p=>p.trackVersionId==='work').at,1000);assert.equal(s.social.goblin.lastPostDay,clock);
});
