import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceGoblinActiveChat} from '../src/goblin-conversation.js';
import {advanceGoblin} from '../src/goblin-mentor.js';
import {GOBLIN_ID} from '../src/goblin-catalog.js';
import {mountGoblinDialog} from '../src/goblin-dialog-view.js';
import {pcDocument} from './helpers/virtual-pc-dom.js';
const tick=(s,seconds,options={})=>advanceGoblinActiveChat(s,{nowMinute:100,activeSeconds:seconds,visible:true,powered:true,paused:false,...options}).state;
function fixture(){const s=advanceGoblin(createVirtualPcState(),0).state;s.social.goblin.pending=[{id:'speed',at:10,body:'я'.repeat(60)}];return s;}
test('online Goblin types three Unicode characters per real second and retains progress across reload',()=>{
 let s=fixture();s=tick(s,19);assert.equal(s.social.dialogs[GOBLIN_ID].messages.length,0);
 s=createVirtualPcState(JSON.parse(JSON.stringify(s)));assert.equal(tick(s,30,{paused:true}),s);
 s=tick(s,.9);assert.equal(s.social.dialogs[GOBLIN_ID].messages.length,0);s=tick(s,.1);assert.equal(s.social.dialogs[GOBLIN_ID].messages.length,1);
});
test('online typing consumes queued messages serially, counting emoji as one character',()=>{
 let s=fixture();s.social.goblin.pending=[{id:'a',at:10,body:'я🙂!'},{id:'b',at:11,body:'123456'}];s=tick(s,2.9);
 assert.deepEqual(s.social.dialogs[GOBLIN_ID].messages.map(m=>m.id),['goblin:a']);s=tick(s,.1);assert.equal(s.social.dialogs[GOBLIN_ID].messages.length,2);
});
test('the game clock cannot bypass typing while the Goblin conversation is online',()=>{
 const s=tick(fixture(),1),online=advanceGoblin(s,100,{online:true}).state;
 assert.equal(online.social.dialogs[GOBLIN_ID].messages.length,0);assert.equal(online.social.goblin.pending[0].activeElapsedSeconds,1);
 const offline=advanceGoblin(online,100).state;assert.equal(offline.social.dialogs[GOBLIN_ID].messages.length,1);
});
test('the mounted chat delivers at the typing boundary without waiting for another save checkpoint',()=>{
 let state=fixture();state.power='on';const view=mountGoblinDialog(pcDocument(),{getState:()=>state,getMetadata:()=>({gameMinutes:100}),navigate(){},commit:r=>{state=r.state;return true;}});
 view.tickOutgoingMessage(19.9);assert.equal(state.social.dialogs[GOBLIN_ID].messages.length,0);view.tickOutgoingMessage(.1);assert.equal(state.social.dialogs[GOBLIN_ID].messages.length,1);view.dispose();
});
