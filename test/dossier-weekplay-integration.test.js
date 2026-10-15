import test from 'node:test';
import assert from 'node:assert/strict';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {ApartmentTime} from '../src/apartment-v3-time.js';
import {advanceHomeFrame,prepareApartmentConfig,startHomeAction} from '../src/apartment-v3-runtime.js';
import {installationElapsedSeconds} from '../src/pc-installation-clock.js';
import {advanceInstallation,openInstaller,advanceInstaller} from '../src/pc-software.js';
import {createVirtualPcState,loadVirtualPcState,saveVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceSocial} from '../src/social-runtime.js';
import {publishCommunityNotices,markCommunitySeen,communityUnreadCounts} from '../src/social-community-publications.js';
import {createSocialBackground} from '../src/social-background.js';
import {createSocialWorkerRuntime} from '../src/social-worker-runtime.js';
import {startCaseStudy,advanceCaseStudy} from '../src/rap-research.js';
import {publicDossierCase,publicDossierTarget} from '../src/rap-dossier-cases.js';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {studySkills} from './helpers/analysis-fixture.js';
import {dossierBoardFixture} from './helpers/dossier-board-fixture.js';
import {dossierTransitionFixture} from './helpers/dossier-transition-fixture.js';
import {mountRapDossier} from '../src/rap-dossier-view.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
const battleId='makarevich-1',caseId='battle:'+battleId;

test('Worker-generated round appears in the already mounted board only at publication and routes its new cards',async()=>{
 let state=dossierTransitionFixture(),minute=13439,request,worker;const calculate=createSocialWorkerRuntime(),urls=[];
 const root=pcDocument().createElement('main'),ui=mountRapDossier(root,{getState:()=>state,getMetadata:()=>({gameMinutes:minute}),navigate:url=>urls.push(url)});
 const cards=()=>allPc(root).filter(n=>n.dataset?.dossierNode),roundId='round:makarevich-1:round-2',opponentId='opponent:mak-npc-01';
 const background=createSocialBackground({getState:()=>state,createWorker:()=>worker={postMessage:m=>request=structuredClone(m),terminate(){}},persist:()=>true,onState:next=>state=next});
 try{
  assert.deepEqual(Object.keys(state.tournaments.byId[battleId].rounds),['selection']);
  background.tick(minute,{},0);worker.onmessage({data:calculate(request)});
  assert.equal(state.tournaments.byId[battleId].rounds['round-2'],undefined);
  assert.ok(!cards().some(n=>[roundId,opponentId].includes(n.dataset.dossierNode)));
  const mounted=root.children[0];minute=13440;background.tick(minute,{},300);worker.onmessage({data:calculate(request)});
  assert.equal(background.snapshot.error,'');assert.equal(state.tournaments.byId[battleId].currentRoundId,'round-2');
  assert.ok(state.tournaments.byId[battleId].events.some(e=>e.type==='round-announced'&&e.roundId==='round-2'&&e.dueAt===13440));
  // The same mounted view must consume the committed result on its normal tick.
  await new Promise(resolve=>setTimeout(resolve,260));ui.update();assert.equal(root.children[0],mounted);
  const round=cards().find(n=>n.dataset.dossierNode===roundId),opponent=cards().find(n=>n.dataset.dossierNode===opponentId);assert.ok(round);assert.ok(opponent);
  const before=publicDossierCase(state,{caseId,nowMinute:13439}),after=publicDossierCase(state,{caseId,nowMinute:13440});
  assert.ok(!before.nodes.some(n=>n.roundId==='round-2'||n.kind==='opponent'));
  assert.ok(!after.edges.some(e=>e.kind==='judge'&&e.from===roundId));
  for(const secret of ['qualities','heroSkillSnapshot','knownFacts','weights','recoveryData'])assert.ok(!JSON.stringify(after).includes('"'+secret+'"'));
  round.click();findButton(root,'Открыть источник').click();opponent.click();findButton(root,'Открыть профиль').click();
  assert.deepEqual(urls,['underweb://social/results/makarevich-1/round-2','underweb://social/profile/mak-npc-01']);
 }finally{background.dispose();ui.dispose();}
});

test('manual sleep completes powered installer and publishes one durable notification backlog',()=>{
 const config=prepareApartmentConfig({bounds:[-2,2],spawn:[1,0,.8],speed:1,doorX:0,actions:{bed:{approach:[1,0,.8],pose:[1,.4,0],yaw:0,clip:'sleep',fade:true,duration:5}}});
 const motion=new ApartmentMotion(config),clock=new ApartmentTime({day:10,minutes:480});
 let state=topicFixture();state.power='on';state.social.subscriptions=[battleId];
 // Use the catalog archive size, independent of the clock under test.
 state.software.ft.receivedBytes=800000000;state=openInstaller(state,'ft').state;
 for(let i=0;i<3;i++)state=advanceInstaller(state).state;
 assert.equal(state.software.installer.step,'install');assert.equal(state.software.ft.installed,false);
 assert.equal(startHomeAction(motion,clock,'bed',{mode:'manual',minutesPerSecond:45}).allowed,true);
 for(let i=0;i<600&&!clock.isSleeping;i++)advanceHomeFrame(motion,clock,1/60);
 for(let i=0;i<896;i++){
  const before=(clock.day-1)*1440+clock.minutes;advanceHomeFrame(motion,clock,.25);
  state=advanceInstallation(state,installationElapsedSeconds({activeSeconds:.25,advancedGameMinutes:(clock.day-1)*1440+clock.minutes-before,powered:true,paused:false})).state;
 }
 assert.equal(clock.isSleeping,true);assert.equal(state.software.ft.installed,true);
 const now=(clock.day-1)*1440+clock.minutes;assert.ok(now>=23520);
 state=advanceSocial(state,now).state;state=publishCommunityNotices(state,now).state;
 assert.ok(state.phone.queue.some(n=>n.type==='community-post'));
 const queue=structuredClone(state.phone);state=createVirtualPcState(state);
 assert.deepEqual(publishCommunityNotices(state,now).state.phone,queue);
 assert.equal(motion.wakeUp(),true);advanceHomeFrame(motion,clock,.01);assert.equal(clock.isSleeping,false);
});

test('group read rejects a calculated stale Worker publication before saving or restoring unread notices',()=>{
 let state=topicFixture();state.social.subscriptions=[battleId];state=publishCommunityNotices(state,13800).state;
 assert.ok(communityUnreadCounts(state,{nowMinute:13800}).total>0);
 let request,worker,commits=0;const calculate=createSocialWorkerRuntime();
 const background=createSocialBackground({getState:()=>state,createWorker:()=>worker={postMessage:m=>request=structuredClone(m),terminate(){}},persist:()=>{commits++;return true;},onState:next=>state=next});
 try{
  background.tick(13800,{},0);const reply=calculate(request);assert.equal(reply.error,undefined);
  state=markCommunitySeen(state,{communityId:battleId,nowMinute:13800}).state;const read=structuredClone(state.social.communityReads);
  worker.onmessage({data:reply});assert.equal(commits,0);assert.equal(communityUnreadCounts(state,{nowMinute:13800}).total,0);assert.deepEqual(state.social.communityReads,read);
  background.tick(13800,{},300);worker.onmessage({data:calculate(request)});
  assert.equal(commits,1);assert.equal(communityUnreadCounts(state,{nowMinute:13800}).total,0);
  assert.ok(!state.phone.queue.some(n=>n.type==='community-post'));
 }finally{background.dispose();}
});

test('research spanning a published round preserves cutoff and exposes new opponent without future judge knowledge',()=>{
 let state=topicFixture();state.software.dossier.installed=true;state.music.needs={satiety:100,energy:100};
 state.tournaments.byId[battleId].rounds['round-2'].pairs=[{nodeId:'pair',participantIds:['player','mak-npc-01'],technical:{kind:'judged'}}];
 assert.ok(!publicDossierCase(state,{caseId,nowMinute:13439}).nodes.some(n=>n.roundId==='round-2'));
 const started=startCaseStudy(state,{kind:'battle',battleId,heroSnapshot:studySkills(80),nowMinute:13400});assert.equal(started.ok,true);
 const snapshot=structuredClone(started.state.rapResearch.job);
 const finished=advanceCaseStudy(started.state,{gameMinutes:360,nowMinute:13760});assert.equal(finished.finished,true);state=finished.state;
 const finding=Object.values(state.rapResearch.findings)[0];assert.equal(finding.cutoff,13400);assert.deepEqual(finding.sourceIds,snapshot.sourceIds);
 const graph=publicDossierCase(state,{caseId,nowMinute:13760});assert.ok(graph.nodes.some(n=>n.roundId==='round-2'));assert.ok(graph.nodes.some(n=>n.kind==='opponent'&&n.characterId==='mak-npc-01'));
 assert.ok(!graph.edges.some(e=>e.kind==='judge'&&e.from==='round:makarevich-1:round-2'));
 for(const forbidden of ['qualities','heroSnapshot','weights','recoveryData'])assert.ok(!JSON.stringify(graph).includes('"'+forbidden+'"'));
});

test('legacy save and missing source keep completed observations readable; quota preserves previous bytes',()=>{
 let state=dossierBoardFixture();const reports=structuredClone(state.rapAnalysis.reports),exports=structuredClone(state.audioExports),versions=structuredClone(state.trackVersions);
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert.equal(saveVirtualPcState(storage,state),true);assert.equal(loadVirtualPcState(storage).ok,true);
 const before=[...values];assert.equal(saveVirtualPcState({getItem:storage.getItem,setItem(){throw Error('quota');}},state),false);assert.deepEqual([...values],before);
 delete state.trackVersions.byId.weak;state=createVirtualPcState(state);
 assert.deepEqual(state.rapAnalysis.reports,reports);const target=publicDossierTarget(state,{reportId:Object.values(reports).find(r=>r.trackVersionId==='weak').id,nowMinute:13900});
 assert.ok(target);assert.equal(target.node.action,null);assert.ok(target.node.reports.length>0);
 const damaged=structuredClone(state);damaged.rapResearch.findings.bad={id:'bad',sourceIds:['unknown']};
 const recovered=createVirtualPcState(damaged);assert.ok(recovered.rapResearch.recovery.some(r=>r.id==='bad'));assert.deepEqual(recovered.rapAnalysis.reports,reports);
 const legacy=createVirtualPcState({version:1,power:'on',trackVersions:versions,audioExports:exports,rapAnalysis:state.rapAnalysis});
 assert.deepEqual(legacy.audioExports,exports);assert.deepEqual(legacy.rapAnalysis.reports,reports);
});
