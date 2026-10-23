import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceGoblin} from '../src/goblin-mentor.js';
import {goblinReplyContext} from '../src/goblin-conversation.js';
import {GOBLIN_ID} from '../src/goblin-catalog.js';
import {applyToBattle} from '../src/virtual-pc-state.js';
test('small talk is bounded to one message per 48 hours and never catches up a backlog after sleep',()=>{
 let s=advanceGoblin(createVirtualPcState(),480).state;s.social.goblin.stage='finished';s.social.goblin.pending=[];s=advanceGoblin(s,500).state;s=advanceGoblin(s,500+2879).state;assert.equal(s.social.goblin.pending.some(m=>m.followupId?.startsWith('chat:')),false);
 s=advanceGoblin(s,500+2880).state;s=advanceGoblin(s,500+3000).state;assert.equal(s.social.dialogs[GOBLIN_ID].messages.filter(m=>m.followupId?.startsWith('chat:')).length,1);assert.ok(goblinReplyContext(s,3500).choices.length);
 s=advanceGoblin(s,100000).state;assert.ok(s.social.goblin.pending.filter(m=>m.followupId?.startsWith('chat:')).length<=1);s=advanceGoblin(s,100100).state;assert.equal(s.social.dialogs[GOBLIN_ID].messages.filter(m=>m.followupId?.startsWith('chat:')).length,2);
});
test('round results prompt one useful follow-up with a table link across saves',()=>{
 let s=advanceGoblin(createVirtualPcState(),480).state;s.social.goblin.stage='finished';s.social.goblin.pending=[];s.battleApplications=[{battleId:'makarevich-1'}];s.socialRuntime.events.push({id:'result:selection',type:'round-result',battleId:'makarevich-1',roundId:'selection',communityId:'makarevich-1',dueAt:600});s=advanceGoblin(s,600).state;s=advanceGoblin(createVirtualPcState(JSON.parse(JSON.stringify(s))),700).state;const follow=s.social.dialogs[GOBLIN_ID].messages.filter(m=>m.followupId==='result:selection');assert.equal(follow.length,1);assert.ok(follow[0].links.some(l=>l.url.endsWith('/selection')));assert.equal(advanceGoblin(s,800).state.social.dialogs[GOBLIN_ID].messages.filter(m=>m.followupId==='result:selection').length,1);
});

test('mandatory round results survive a long sleep and deliver each result exactly once after reload',()=>{
 let s=advanceGoblin(applyToBattle(createVirtualPcState(),'makarevich-1','Новичок'),480).state;s.social.goblin.stage='finished';s.social.goblin.pending=[];
 for(const [id,at]of [['selection',600],['round-1',700]])s.socialRuntime.events.push({id:'result:'+id,type:'round-result',battleId:'makarevich-1',roundId:id,dueAt:at});
 s=advanceGoblin(s,600+4320).state;s=advanceGoblin(createVirtualPcState(JSON.parse(JSON.stringify(s))),600+4440).state;s=advanceGoblin(s,600+4560).state;
 for(const id of ['selection','round-1'])assert.equal(s.social.dialogs[GOBLIN_ID].messages.filter(m=>m.followupId==='result:'+id).length,1);
});
