import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceSocial} from '../src/social-runtime.js';
import {advanceGoblin,replyToGoblin,goblinPostChance} from '../src/goblin-mentor.js';
import {exportLyricFile,sendGoblinFile,importGoblinFile} from '../src/goblin-exchange.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {abstractRecordingFixture} from './helpers/abstract-recording-fixture.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
import {GOBLIN_ID,GOBLIN_SKILLS} from '../src/goblin-catalog.js';
import {GOBLIN_RELEASES,GOBLIN_PHOTOS,goblinArt} from '../src/goblin-catalog.js';
import {createGoblinProfileView,goblinPublicPosts} from '../src/goblin-profile-view.js';
import {mountGoblinDialog} from '../src/goblin-dialog-view.js';
import {mountSocial} from '../src/social-view.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
import {existsSync} from 'node:fs';
const next=r=>{assert.equal(r.ok,true,r.reason);return r.state;};
const restore=s=>createVirtualPcState(JSON.parse(JSON.stringify(s)));

test('Goblin greets after twenty game minutes and does not duplicate on reload',()=>{
 let state=createVirtualPcState();
 state=advanceSocial(state,480).state;
 assert.ok(state.social.friends.includes('mak-npc-06'));
 assert.equal(state.social.dialogs['mak-npc-06']?.messages.length??0,0);
 state=advanceSocial(state,499).state;
 assert.equal(state.social.dialogs['mak-npc-06']?.messages.length??0,0);
 state=advanceSocial(state,500).state;
 assert.equal(state.social.dialogs['mak-npc-06'].messages.length,1);
 const restored=createVirtualPcState(JSON.parse(JSON.stringify(state)));
 assert.equal(advanceSocial(restored,501).state.social.dialogs['mak-npc-06'].messages.length,1);
});

test('tutorial waits for each real install and subscription; FT reminder is once',()=>{
 let s=advanceGoblin(createVirtualPcState(),480).state;
 s=advanceGoblin(s,500).state;
 s=next(replyToGoblin(s,'normal',500));
 s=advanceGoblin(s,540).state;
 s=next(replyToGoblin(s,'yes',540));
 assert.equal(replyToGoblin(s,'subscribed',550).ok,false);
 s.social.subscriptions.push('makarevich-1');
 s=next(replyToGoblin(s,'subscribed',550));
 s=advanceGoblin(s,560).state;
 assert.equal(s.social.goblin.stage,'client');
 s.software.client.installed=true;
 s=advanceGoblin(s,561).state;
 assert.equal(s.social.goblin.stage,'software');
 s=advanceGoblin(restore(s),600).state;
 assert.equal(s.social.goblin.stage,'software');
 s.software.notebook.installed=true;
 s=advanceGoblin(s,601).state;
 assert.equal(s.social.goblin.stage,'text');
 s=advanceGoblin(s,1041).state;
 s=advanceGoblin(restore(s),1051).state;
 s=advanceGoblin(s,1200).state;
 assert.equal(s.social.dialogs[GOBLIN_ID].messages.filter(m=>m.id==='goblin:ft-check').length,1);
});

test('wall calendar is deterministic across sleep and saves; release order is preserved',()=>{
 assert.deepEqual([1,2,3,4].map(goblinPostChance),[0,5,10,15]);
 let fine=advanceGoblin(createVirtualPcState(),480).state;
 const start=structuredClone(fine);
 for(let d=1;d<=40;d++)fine=advanceGoblin(restore(fine),d*1440+1439).state;
 const coarse=advanceGoblin(start,40*1440+1439).state;
 assert.deepEqual(coarse.social.goblin.posts,fine.social.goblin.posts);
 assert.deepEqual(coarse.social.goblin.scheduled,fine.social.goblin.scheduled);
 assert.deepEqual(coarse.social.goblin.posts.filter(p=>p.releaseId).slice(2,4).map(p=>p.releaseId),['bitboy-demo','bitboy-soundgoodizer']);
 const huge=advanceGoblin(start,10000*1440).state;
 assert.equal(huge.social.goblin.nextDay,91);
});

test('mentor exchange preserves originals and player XP; final WAV survives save and keeps player voice',()=>{
 let s=abstractRecordingFixture({experimentalLead:true});
 for(const app of ['client','ft','notebook'])s.software[app].installed=true;
 s=advanceGoblin(s,480).state;
 s.social.goblin.stage='text';
 const original=structuredClone(s.projects);
 const practice=()=>[s.music.practice,s.writing.practice,s.recording.practice];
 const before=structuredClone(practice());
 s=next(exportLyricFile(s,'lyrics',500));
 assert.equal(sendGoblinFile({...s,battleApplications:[]},s.social.goblin.files[0].id,500).ok,false);
 s=next(sendGoblinFile(s,s.social.goblin.files[0].id,500));
 assert.equal(importGoblinFile(s,'goblin-return-text',519).ok,false);
 s=advanceGoblin(restore(s),520).state;
 const d=pcDocument(),dialog=mountGoblinDialog(d,{getState:()=>s,getMetadata:()=>({gameMinutes:520,playerName:'Герой'}),navigate:()=>{},commit:()=>true,audio:{releaseRows(){}}});
 assert.ok(findButton(dialog.root,'Сохранить и открыть текст'));dialog.dispose();
 s=next(importGoblinFile(s,'goblin-return-text',520));
 const exportBeat=next(createAudioExport(s,{id:'test-beat',projectId:'beat',kind:'beat',folderId:'exports',filename:'Мой бит',nowMinute:530}));
 s=next(sendGoblinFile(exportBeat,'test-beat',530));
 s=advanceGoblin(restore(s),550).state;
 s=next(importGoblinFile(s,'goblin-return-beat',550));
 const beatId=s.social.goblin.received['goblin-return-beat'],textId=s.social.goblin.received['goblin-return-text'];
 assert.ok(!s.projects.find(p=>p.id===beatId).recording);
 assert.deepEqual(practice(),before);
 s.music.needs={satiety:100,energy:100};
 s=next(startVocalWork(s,{beatId,textId},GOBLIN_SKILLS,()=>.2));
 s=advanceVocalWork(s,1000).state;
 const practiceBeforeMix=structuredClone(practice());
 const voice=structuredClone(s.projects.find(p=>p.id===beatId).recording);
 s=next(createAudioExport(s,{id:'test-track',projectId:beatId,kind:'track',folderId:'exports',filename:'Мой голос',nowMinute:600}));
 s=next(sendGoblinFile(s,'test-track',600));
 s=advanceGoblin(restore(s),620).state;
 s=next(importGoblinFile(s,'goblin-return-track',620));
 s=restore(s);
 const received=s.audioExports.files.find(f=>f.id==='received-goblin-return-track');
 assert.ok(received);assert.equal(received.voiceId,voice.voiceId);
 assert.ok(s.trackVersions.byId[received.trackVersionId]);
 assert.equal(s.audioExports.recovery.length,0);
 assert.deepEqual(s.projects.filter(p=>original.some(o=>o.id===p.id)),original);
 const result=s.projects.find(p=>p.id===s.social.goblin.received['goblin-return-track']).recording;
 assert.deepEqual(result.clean,voice.clean);assert.deepEqual(result.text,voice.text);
 assert.equal(result.mix.skill,25);assert.equal(result.master.skill,25);
 assert.deepEqual(practice(),practiceBeforeMix);
 assert.equal(sendGoblinFile(s,'test-track',700).ok,false);
 assert.equal(next(importGoblinFile(s,'goblin-return-track',700)).projects.length,s.projects.length);
});

test('profile starts with two songs and photos, lazy assets exist, future battle work is hidden',()=>{
 const s=advanceGoblin(createVirtualPcState(),480).state,d=pcDocument();
 const view=createGoblinProfileView(d,{getState:()=>s,getMetadata:()=>({gameMinutes:480}),navigate(){},commit(){},audio:{stop(){}}});
 assert.equal(allPc(view).filter(n=>n.tagName==='AUDIO').length,2);
 assert.deepEqual(goblinPublicPosts(s,480).map(p=>p.dateLabel),['13.03.2012 06:51','17.11.2011 22:38']);
 assert.ok(allPc(view).some(n=>n.tagName==='TIME'&&n.textContent==='13.03.2012 06:51'));
 assert.equal(GOBLIN_PHOTOS.find(p=>p.id==='stairs').title,'Я, MC Филя и бутылка пива');
 assert.ok(allPc(view).filter(n=>n.tagName==='AUDIO').every(n=>n.getAttribute('preload')==='none'));
 assert.ok(allPc(view).filter(n=>n.tagName==='IMG').slice(1).every(n=>n.getAttribute('loading')==='lazy'));
 for(const r of GOBLIN_RELEASES){
  if(existsSync('assets/audio/goblin'))assert.ok(existsSync(r.mediaUrl),r.mediaUrl); // Optional local sound pack.
  assert.ok(existsSync(goblinArt(r.art)),r.art);
 }
 for(const p of GOBLIN_PHOTOS)assert.ok(existsSync(p.src),p.src);
 s.trackVersions.byId.test={id:'test',name:'Дождь на районе'};
 s.battleHistory.entries=[{id:'e',participantId:GOBLIN_ID,battleId:'makarevich-1',roundId:'selection',status:'submitted',trackVersionId:'test',occurredAt:600}];
 assert.equal(goblinPublicPosts(s,599).filter(p=>p.trackVersionId).length,0);
 assert.equal(goblinPublicPosts(s,600).find(p=>p.trackVersionId)?.art,'rain');
});

test('historical dates replace old midnight posts without resetting the tutorial or wall',()=>{
 const s=advanceGoblin(createVirtualPcState(),480).state;
 const before=structuredClone(s.social.goblin);
 for(const p of s.social.goblin.posts){p.at=0;delete p.dateLabel;}
 s.social.goblin.posts.push({id:'goblin:diary:9',at:14011,diaryIndex:1});
 const g=restore(s).social.goblin;
 assert.deepEqual(g.posts.slice(0,2),before.posts);
 assert.equal(g.posts[2].at,14011);
 assert.deepEqual(g.pending,before.pending);assert.equal(g.stage,before.stage);
 assert.equal(g.lastPostDay,before.lastPostDay);
});

test('profile keeps its music controls through clock ticks and messages, and releases them on close',()=>{
 let s=advanceGoblin(createVirtualPcState(),480).state,minute=480,stopped=0;
 const d=pcDocument(),create=d.createElement;
 d.createElement=tag=>{
  const n=create(tag);
  n.querySelectorAll=selector=>selector==='audio[data-goblin-audio]'?allPc(n).filter(c=>c.tagName==='AUDIO'&&c.getAttribute('data-goblin-audio')):[];
  n.removeAttribute=key=>n.attributes.delete(key);
  if(tag==='audio'){n.pause=()=>stopped++;n.load=()=>{};}return n;
 };
 const root=d.createElement('div'),view=mountSocial(root,{route:{section:'profile',profileId:GOBLIN_ID,view:'page'},getState:()=>s,getMetadata:()=>({gameMinutes:minute}),navigate(){},onChange(){return true;}});
 const control=allPc(root).find(n=>n.tagName==='AUDIO');
 minute=500;s=advanceGoblin(s,minute).state;view.update();
 assert.equal(allPc(root).find(n=>n.tagName==='AUDIO'),control);
 assert.equal(stopped,0);
 view.dispose();assert.equal(stopped,2);
});
