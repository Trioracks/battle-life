import test from 'node:test';
import assert from 'node:assert/strict';
import * as personal from '../src/social-personal.js';
import {createVirtualPcState,loadVirtualPcState,saveVirtualPcState,VIRTUAL_PC_STORAGE_KEY as KEY} from '../src/virtual-pc-state.js';
import {normalizeSocial,addSocialFriend} from '../src/social-state.js';
import {advanceVirtualPcDurably} from '../src/virtual-pc-runtime.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {attachSubmissionTrack} from '../src/social-submission.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
test('schema1 seeds three histories once, preserves organizer data, money and frozen audio',()=>{
 const old=createVirtualPcState();old.social={schemaVersion:1,personalAudioIds:['track'],dialogs:{'makarevich-1':{messages:[{id:'old',body:'old wording'}],draftVersionId:'track',unread:true}}};const before=structuredClone(old);
 const next=personal.seedPersonalDialogs(old);assert.equal(next.social.schemaVersion,2);assert.equal(next.social.dialogs['makarevich-1'].draftVersionId,'track');assert.deepEqual(next.social.dialogs['makarevich-1'].messages,before.social.dialogs['makarevich-1'].messages);assert.deepEqual(next.trackVersions,before.trackVersions);assert.equal(next.music.cash,before.music.cash);
 for(const id of ['anya','dasha','vitya']){const dialog=next.social.dialogs[id];assert.deepEqual(dialog.peer,{kind:'person',id});assert.ok(dialog.messages.length>=4);assert.ok(dialog.messages.every(m=>m.archived&&m.at===null&&m.dateLabel));assert.equal(dialog.unread,false);assert.equal(resolveSocialRoute('underweb://social/dialog/'+id).peer.kind,'person');}
 assert.deepEqual(personal.seedPersonalDialogs(next),next);assert.deepEqual(old,before);assert.equal(normalizeSocial({dialogs:{evil:{messages:[]}}}).dialogs.evil,undefined);
});
test('Vitya sends on days 1 and 3 exactly once, catch-up survives reload and does not charge money',()=>{
 const seed=createVirtualPcState();assert.equal(personal.advancePersonalDialogs(seed,599).events.length,0);
 const first=personal.advancePersonalDialogs(seed,600);assert.equal(first.events.length,1);assert.equal(personal.unreadDialogCount(first.state),1);assert.equal(personal.advancePersonalDialogs(first.state,600).events.length,0);
 const second=personal.advancePersonalDialogs(createVirtualPcState(first.state),3480);assert.equal(second.events.length,1);assert.equal(personal.unreadDialogCount(second.state),1);assert.equal(second.state.music.cash,seed.music.cash);assert.equal(personal.advancePersonalDialogs(createVirtualPcState(second.state),5000).events.length,0);
 const catchup=personal.advancePersonalDialogs(seed,4000);assert.equal(catchup.events.length,2);assert.equal(catchup.state.phone.queue.length,2);assert.equal(catchup.state.phone.activeId,catchup.events[0].id);
 assert.equal(personal.searchDialogs(second.state,'ВИТЯ')[0].id,'vitya');assert.ok(personal.searchDialogs(second.state,'верну').some(d=>d.id==='vitya'));
});
test('block/remove is monotonic, keeps history, stops future events and rejects addFriend',()=>{
 const first=personal.advancePersonalDialogs(createVirtualPcState(),600).state,history=first.social.dialogs.vitya.messages;
 const r=personal.blockAndRemoveFriend(first,'vitya');assert.equal(r.ok,true);assert.equal(r.state.social.friends.includes('vitya'),false);assert.deepEqual(r.state.social.dialogs.vitya.messages,history);assert.equal(addSocialFriend(r.state,'vitya').ok,false);
 assert.equal(personal.advancePersonalDialogs(createVirtualPcState(r.state),3480).events.length,0);assert.deepEqual(personal.blockAndRemoveFriend(r.state,'vitya').state,r.state);assert.equal(personal.blockAndRemoveFriend(first,'missing').ok,false);
});
test('raw schema1 backup precedes writes; failure preserves original and all retained data',()=>{
 const old=createVirtualPcState();old.social.schemaVersion=1;const raw=JSON.stringify(old),store=new Map([[KEY,raw]]),backup=KEY+'-before-personal-dialogs-v2';let quota=true;
 const storage={getItem:k=>store.get(k)??null,setItem(k,v){if(quota&&k===backup)throw Error('quota');store.set(k,v);}};
 const failed=loadVirtualPcState(storage);assert.equal(failed.ok,false);assert.equal(failed.reason,'personal-dialogs-backup-failed');assert.equal(saveVirtualPcState(storage,failed.state),false);assert.equal(store.get(KEY),raw);
 quota=false;const loaded=loadVirtualPcState(storage);assert.equal(loaded.ok,true);assert.equal(store.get(backup),raw);assert.equal(saveVirtualPcState(storage,loaded.state),true);assert.equal(loadVirtualPcState(storage).state.social.schemaVersion,2);assert.deepEqual(loaded.state.projects,old.projects);
});
test('personal notifications are invisible before durable publication, retry is idempotent',()=>{
 const seed=createVirtualPcState();const failed=advanceVirtualPcDurably(seed,{day:1,minutes:600},()=>false);assert.equal(failed.state,seed);assert.deepEqual(failed.events,[]);assert.equal(seed.phone.queue.length,0);
 const saved=advanceVirtualPcDurably(failed.state,{day:1,minutes:600},()=>true);assert.equal(saved.events.length,1);assert.equal(saved.state.social.dialogs.vitya.unread,true);assert.equal(advanceVirtualPcDurably(saved.state,{day:1,minutes:600},()=>true).events.length,0);
});
test('new organizer drafts have a community peer immediately, without requiring reload',()=>{
 const s=ensureBattleWindow(submissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state,r=attachSubmissionTrack(s,{communityId:'makarevich-1',projectId:'beat',nowMinute:601});assert.equal(r.ok,true);assert.deepEqual(r.state.social.dialogs['makarevich-1'].peer,{kind:'community',id:'makarevich-1'});
});
