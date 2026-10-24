import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceGoblin,replyToGoblin,goblinChoices} from '../src/goblin-mentor.js';
import {advanceGoblinActiveChat,goblinReplyContext,goblinTypingSeconds} from '../src/goblin-conversation.js';
import {GOBLIN_ID} from '../src/goblin-catalog.js';
import {mountGoblinDialog} from '../src/goblin-dialog-view.js';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';
const tick=(state,activeSeconds=state.social.goblin.pending[0]?goblinTypingSeconds(state.social.goblin.pending[0]):1,extra={})=>advanceGoblinActiveChat(state,{nowMinute:500,activeSeconds,visible:true,powered:true,paused:false,...extra});
const messages=s=>s.social.dialogs[GOBLIN_ID]?.messages??[];
function invitation(){let s=advanceGoblin(createVirtualPcState(),480).state;s=advanceGoblin(s,500).state;return replyToGoblin(s,'normal',500).state;}

test('an arriving portrait refreshes existing outgoing messages without reopening the chat',()=>{
 let state=invitation();const view=mountGoblinDialog(pcDocument(),{getState:()=>state,getMetadata:()=>({gameMinutes:500,playerName:'Игрок'}),navigate(){},commit:()=>true});
 const avatars=()=>allPc(view.root).filter(n=>n.tagName==='IMG'&&n.getAttribute('alt')==='Аватар: Игрок');
 assert.equal(avatars().length,0);
 state={...state,social:{...state.social,playerPortrait:{url:'data:image/jpeg;base64,'+Buffer.from([255,216,255,192,0,11,8,1,0,1,0,1,1,17,0,255,217]).toString('base64')}}};view.update();
 assert.equal(avatars().length,1);assert.equal(avatars()[0].getAttribute('src'),state.social.playerPortrait.url);view.dispose();
});
test('online delivery uses the same stable message IDs as fallback and pauses when not visible',()=>{
 let s=invitation();assert.equal(tick(s,3,{visible:false}).state,s);assert.equal(tick(s,.1).events.length,0);s=tick(s).state;assert.ok(messages(s).some(m=>m.id==='goblin:mood'));
 s=createVirtualPcState(JSON.parse(JSON.stringify(s)));s=advanceGoblin(s,600).state;assert.equal(messages(s).filter(m=>m.id==='goblin:mood').length,1);
});
test('the visible chat drives online delivery only after its state is durably accepted',()=>{
 let state=invitation(),accept=false;state.power='on';const d=pcDocument(),view=mountGoblinDialog(d,{getState:()=>state,getMetadata:()=>({gameMinutes:500}),navigate(){},commit:r=>{if(!accept)return false;state=r.state;return true;}});
 view.tickOutgoingMessage(30);assert.equal(messages(state).some(m=>m.id==='goblin:mood'),false);accept=true;view.tickOutgoingMessage(3);assert.equal(messages(state).filter(m=>m.id==='goblin:mood').length,1);state=advanceGoblin(state,600).state;assert.equal(messages(state).filter(m=>m.id==='goblin:mood').length,1);view.dispose();
});
test('a music question cancels stale biography/company but keeps the battle invitation link',()=>{
 let s=tick(invitation()).state;assert.ok(goblinReplyContext(s,500).choices.some(([id])=>id==='music'));const r=replyToGoblin(s,'music',500);assert.equal(r.ok,true,r.reason);s=r.state;assert.equal(s.social.goblin.pending.some(m=>['biography','company'].includes(m.id)),false);for(let i=0;i<4;i++)s=tick(s).state;
 assert.ok(messages(s).some(m=>m.links?.some(l=>l.url.includes('makarevich-1'))));assert.equal(messages(s).filter(m=>m.id==='goblin:invite').length,1);assert.equal(replyToGoblin(s,'music',500).ok,false);
});
test('subscription and install claims are absent until real facts exist, and revalidated at send',()=>{
 let s=invitation();s=advanceGoblin(s,540).state;s=replyToGoblin(s,'yes',540).state;assert.equal(goblinChoices(s).some(([id])=>id==='subscribed'),false);assert.match(goblinReplyContext(s,540).hint,/подпиш/i);s.social.subscriptions.push('makarevich-1');assert.ok(goblinChoices(s).some(([id])=>id==='subscribed'));s.social.subscriptions=[];assert.equal(replyToGoblin(s,'subscribed',540).ok,false);
 s.social.goblin.stage='text';assert.equal(goblinChoices(s).some(([id])=>id==='installed-notebook'),false);s.software.notebook.installed=true;assert.ok(goblinChoices(s).some(([id])=>id==='installed-notebook'));s.software.notebook.installed=false;assert.equal(replyToGoblin(s,'installed-notebook',540).ok,false);
});
