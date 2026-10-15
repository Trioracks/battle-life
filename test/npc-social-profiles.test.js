import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNpcSocialProfiles,publicCharacterProfile} from '../src/npc-social-profiles.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {DEMO_PARTICIPANTS} from '../src/battle-demo-config.js';
import {normalizeAppearance} from '../src/avatar-v3-profile.js';
import {opponentFixture} from './helpers/social-profile-fixture.js';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {recordBattleHistory} from '../src/battle-history.js';
import {ensureNpcRoundTrack} from '../src/battle-npc.js';
import {createSocialProfileView} from '../src/social-profile-view.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
test('six of32personal identities get one saved appearance and3–4photo IDs without changing skills',()=>{
 const s=createVirtualPcState(),p=s.npcSocialProfiles.byId,personal=DEMO_PARTICIPANTS.map(n=>p[n.characterId]).filter(p=>p.profileType==='personal');assert.equal(personal.length,6);
 for(const p of personal){assert.deepEqual(normalizeAppearance(p.appearance),p.appearance);assert.ok(p.photoIds.length>=3&&p.photoIds.length<=4);assert.equal(new Set(p.photoIds).size,p.photoIds.length);assert.ok(!p.skills);}
 assert.deepEqual(createVirtualPcState(JSON.parse(JSON.stringify(s))).npcSocialProfiles,s.npcSocialProfiles);
 const broken=normalizeNpcSocialProfiles({version:1,byId:{'mak-npc-01':{appearance:null}},recovery:[]});assert.equal(broken.byId['mak-npc-01'],undefined);assert.equal(broken.recovery.length,1);assert.equal(normalizeNpcSocialProfiles(broken).recovery.length,1);
});
test('profile public projection filters future posts, tracks and histories and omits true qualities',()=>{
 let s=opponentFixture();const made=ensureNpcRoundTrack(s,{characterId:'mak-npc-01',battleId:'makarevich-1',roundId:'selection',nowMinute:10680});s=made.state;s=recordBattleHistory(s,[{id:'submitted-a',participantId:'mak-npc-01',battleId:'makarevich-1',roundId:'selection',status:'submitted',trackVersionId:made.trackVersionId,occurredAt:10680},{id:'future',participantId:'mak-npc-01',battleId:'makarevich-1',roundId:'round-2',status:'no_show',trackVersionId:null,occurredAt:23520}]);
 s.npcSocialProfiles.byId['mak-npc-01'].datedPosts=[{id:'past',at:100,body:'Вчера дома',date:'2012-09-01'},{id:'future',at:25000,body:'Будущий секрет',date:'2012-09-18'}];
 const p=publicCharacterProfile(s,{characterId:'mak-npc-01',nowMinute:14000});assert.equal(p.canView,true);assert.equal(p.posts.length,1);assert.deepEqual(p.publicTrackVersionIds,[made.trackVersionId]);assert.equal(p.history.length,1);assert.ok(!/skills|diagnosticIndex|rawScore|qualities|Будущий секрет/.test(JSON.stringify(p)));
 const locked=publicCharacterProfile(s,{characterId:'mak-npc-02',nowMinute:14000});assert.equal(locked.canView,false);assert.equal(locked.posts,undefined);assert.equal(locked.appearance,undefined);
 const d=pcDocument(),view=createSocialProfileView(d,{id:'mak-npc-01',getState:()=>s,getMetadata:()=>({gameMinutes:14000}),navigate:()=>{},commit:()=>{},audio:{row:()=>d.createElement('div')}});assert.ok(findButton(view,'История баттлов'));assert.ok(!allPc(view).some(n=>n.textContent?.includes('Будущий секрет')));
});
test('the same canonical judge identity is reused in announcements and profiles',()=>{const s=topicFixture(),p=publicCharacterProfile(s,{characterId:'eparhiya',nowMinute:14000});assert.equal(p.characterId,'eparhiya');assert.ok(p.roles.includes('judge'));assert.equal(p.canView,true);assert.equal(Object.values(s.npcSocialProfiles.byId).filter(x=>x.characterId==='eparhiya').length,1);});
