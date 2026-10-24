import test from 'node:test';
import assert from 'node:assert/strict';
import {createSocialBackground} from '../src/social-background.js';
import {createSocialWorkerRuntime} from '../src/social-worker-runtime.js';
import {createVirtualPcState,preparePcRuntimeState,preparePcSaveArchives,primePcSaveArchives,saveVirtualPcState,loadVirtualPcState,VIRTUAL_PC_STORAGE_KEY} from '../src/virtual-pc-state.js';
import {advanceSocial,activateSocial} from '../src/social-runtime.js';
import {blockAndRemoveFriend} from '../src/social-personal.js';
import {advanceVirtualPc} from '../src/virtual-pc-runtime.js';
import {downloadClient} from '../src/pc-software.js';
import {freshDemo,produceDemoTrack,submitDemoTrack,BATTLE} from './helpers/package-two-fixture.js';

function harness(initial=createVirtualPcState(),getGoblinOnline){
 let state=preparePcRuntimeState(initial),saveOk=true,saves=0;const workers=[],errors=[];
 const greetingWasDelivered=state.socialRuntime.events.some(e=>e.id==='personal:vitya:day1');
 const storage={data:new Map(),getItem(k){return this.data.get(k)??null;},setItem(k,v){this.data.set(k,v);}};
 const runtime=createSocialBackground({getState:()=>state,getGoblinOnline,createWorker:()=>{
  const calculate=createSocialWorkerRuntime(),worker={sent:[],terminated:false,postMessage(m){this.sent.push(structuredClone(m));},terminate(){this.terminated=true;},deliver(){const request=this.sent.shift();const response=structuredClone(calculate(request));this.onmessage?.({data:response});return response;}};workers.push(worker);return worker;
 },persist:(next,archives)=>{saves++;assert.equal(state.socialRuntime.events.some(e=>e.id==='personal:vitya:day1'),greetingWasDelivered,'events cannot appear optimistically');if(!saveOk)return false;primePcSaveArchives(storage,archives);return saveVirtualPcState(storage,next);},onState:next=>state=preparePcRuntimeState(next),onError:e=>errors.push(e)});
 return {runtime,workers,errors,storage,get state(){return state;},set state(v){state=v;},get saves(){return saves;},set saveOk(v){saveOk=v;},tick(t=600,ms=0,options={}){runtime.tick(t,options,ms);},deliver(){return workers.at(-1).deliver();}};
}

test('fractional walking frames queue one background job and coalesce unchanged minutes',()=>{
 const h=harness();for(let i=0;i<200;i++)h.tick(600+i/1000,i);
 assert.equal(h.workers.length,1);assert.equal(h.workers[0].sent.length,1);assert.equal(h.state.socialRuntime.events.length,0);
 h.deliver();assert.equal(h.saves,1);assert.equal(h.state.socialRuntime.events.filter(e=>e.id==='personal:vitya:day1').length,1);
 h.tick(600.9,1000);assert.equal(h.workers[0].sent.length,0);
 h.tick(601.1,1001);assert.equal(h.workers[0].sent.length,1);assert.equal('trackVersions' in h.workers[0].sent[0].patch,false,'archives are not resent on each minute');
});

test('a presence change rejects an in-flight result and recalculates within the same minute',()=>{
 for(const first of [true,false]){
  const h=harness();h.tick(600,0,{goblinOnline:first});h.tick(600,10,{goblinOnline:!first});h.deliver();assert.equal(h.saves,0);
  h.tick(600,300,{goblinOnline:!first});assert.equal(h.workers[0].sent.length,1);h.deliver();assert.equal(h.saves,1);
  h.tick(600,600,{goblinOnline:first});assert.equal(h.workers[0].sent.length,1);h.runtime.dispose();
 }
});
test('opening the chat between dispatch and the next frame invalidates offline delivery immediately',()=>{
 let online=false;const h=harness(undefined,()=>online);h.tick(600,0);online=true;h.deliver();assert.equal(h.saves,0);
 h.tick(600,300);assert.equal(h.workers[0].sent[0].options.goblinOnline,true);h.deliver();assert.equal(h.saves,1);h.runtime.dispose();
});

test('failed persistence latches without recalculation or publication until explicit retry',()=>{
 const h=harness();saveVirtualPcState(h.storage,h.state);const before=h.storage.getItem(VIRTUAL_PC_STORAGE_KEY);h.saveOk=false;h.tick();h.deliver();
 assert.equal(h.saves,1);assert.equal(h.state.socialRuntime.events.length,0);assert.equal(h.errors.length,1);
 for(let i=0;i<500;i++)h.tick(601+i,1000+i*300);
 assert.equal(h.workers[0].sent.length,0);assert.equal(h.saves,1);assert.equal(h.storage.getItem(VIRTUAL_PC_STORAGE_KEY),before);
 h.saveOk=true;h.runtime.retry();h.tick(1100,200000);h.deliver();assert.equal(h.saves,2);assert.equal(h.state.socialRuntime.events.filter(e=>e.id==='personal:vitya:day1').length,1);
});

test('blocking a person during calculation rejects the stale result and preserves the action',()=>{
 const h=harness();h.tick();h.state=blockAndRemoveFriend(h.state,'vitya').state;h.deliver();assert.equal(h.saves,0);assert.equal(h.state.socialRuntime.events.length,0);
 h.tick(600,300);h.deliver();assert.deepEqual(h.state.social.blockedProfileIds,['vitya']);assert.equal(h.state.socialRuntime.events.length,0);
});

test('unrelated work and needs continue while calculation uses the captured skill snapshot',()=>{
 const h=harness();h.tick(600,0,{heroSkills:{writing:10}});const music={...h.state.music,practice:3,needs:{energy:31,satiety:49}},projects=[{id:'progress-in-flight',elapsed:12}];h.state={...h.state,music,projects};h.deliver();
 assert.equal(h.state.music,music);assert.equal(h.state.projects,projects);assert.equal(h.saves,1);
});

test('powered host frames do not discard overdue judging and the next round',()=>{
 const made=produceDemoTrack(freshDemo()),sent=submitDemoTrack(made.state,made.beatId,602);
 const h=harness({...sent,power:'on',lastGameMinute:17280});h.tick(17280);
 h.state=advanceVirtualPc(h.state,{day:13,minutes:0},{deferSocial:true}).state;
 h.deliver();
 const t=h.state.tournaments.byId[BATTLE],round=t.rounds.selection;
 assert.equal(round.status,'complete','a normal powered frame must not throw away completed judging');
 assert.equal(Object.keys(round.judgeBatches).length,5);
 assert.equal(h.state.socialRuntime.events.filter(e=>e.type==='judge-review').length,5);
 assert.equal(t.currentRoundId,'round-2');
 const loaded=loadVirtualPcState(h.storage);assert.equal(loaded.ok,true);
 assert.equal(loaded.state.tournaments.byId[BATTLE].currentRoundId,'round-2');
 h.tick(17280,300);assert.equal(h.workers[0].sent.length,0,'unchanged frames must not repeat the calculation');
 h.runtime.dispose();
});

test('download progress cannot starve social delivery or be overwritten by a worker',()=>{
 const h=harness(downloadClient(createVirtualPcState({power:'on',lastGameMinute:600})).state);
 h.tick(600);h.state=advanceVirtualPc(h.state,{day:1,minutes:601},{deferSocial:true}).state;
 const software=h.state.software;assert.ok(software.client.receivedBytes>0);
 h.deliver();
 assert.equal(h.state.socialRuntime.events.filter(e=>e.id==='personal:vitya:day1').length,1);
 assert.equal(h.state.software,software,'the worker must retain foreground download progress');
 h.runtime.dispose();
});

test('installation changes invalidate a pending mentor calculation',()=>{
 const h=harness();h.tick();
 const software={...h.state.software,notebook:{...h.state.software.notebook,installed:true}};
 h.state={...h.state,software};h.deliver();assert.equal(h.saves,0);assert.equal(h.state.software,software);
 h.tick(600,300);h.deliver();assert.equal(h.saves,1);h.runtime.dispose();
});
test('worker reply retains foreground research findings and analysis reference ownership',()=>{
 const h=harness();h.tick();const rapResearch={version:1,job:{id:'case-study:1',elapsed:25},findings:{},nextSequence:2,recovery:[]},rapAnalysis={...h.state.rapAnalysis,sourceIds:['foreground-track']},judgeDossier={...h.state.judgeDossier,evidence:[]};
 h.state={...h.state,rapResearch,rapAnalysis,judgeDossier};h.deliver();assert.equal(h.state.rapResearch,rapResearch);assert.equal(h.state.rapAnalysis,rapAnalysis);assert.equal(h.state.judgeDossier,judgeDossier);h.runtime.dispose();
});

test('registration and phone-read changes cannot be lost to an in-flight result',()=>{
 for(const key of ['battleApplications','phone']){const h=harness();h.tick();const changed=key==='phone'?{...h.state.phone,enabled:false}:[{battleId:'makarevich-1',nickname:'Now',status:'registered'}];h.state={...h.state,[key]:changed};h.deliver();assert.equal(h.saves,0);assert.equal(h.state[key],changed);}
});

test('reset/dispose ignore late results and do not publish an old campaign',()=>{
 for(const action of ['reset','dispose']){const h=harness();h.tick();const old=h.workers[0],deliver=old.onmessage,response=structuredClone(createSocialWorkerRuntime()(old.sent[0]));h.runtime[action]();deliver({data:response});assert.equal(h.saves,0);assert.equal(h.state.socialRuntime.events.length,0);assert.equal(old.terminated,true);h.tick(601,500);assert.equal(h.workers.length,action==='reset'?2:1);}
});

test('worker failure latches and retry creates a fresh worker',()=>{
 const h=harness();h.tick();h.workers[0].onerror({message:'worker failed',preventDefault(){}});for(let i=0;i<100;i++)h.tick(601+i,500+i*300);assert.equal(h.workers.length,1);assert.equal(h.errors.length,1);
 h.runtime.retry();h.tick(800,100000);assert.equal(h.workers.length,2);h.deliver();assert.equal(h.saves,1);
});

test('preparing an unchanged archive reuses frozen records instead of cloning them back to the room',()=>{
 const h=harness();const archive=h.state.trackVersions;h.tick();h.deliver();assert.equal(h.state.trackVersions,archive);
});

test('real worker calculation equals synchronous close and prepared archives round-trip',()=>{
 const initial=activateSocial(createVirtualPcState(),600).state,at=initial.battleWindows[0].closesAt;
 const expected=advanceSocial(initial,at).state,h=harness(initial);h.tick(at);const result=h.deliver();assert.equal(result.error,undefined);
 for(const key of ['trackVersions','tournaments','npcTracks','battleHistory','socialRuntime','socialReactions'])assert.deepEqual(h.state[key],expected[key],key);
 const loaded=loadVirtualPcState(h.storage);assert.equal(loaded.ok,true);assert.equal(Object.keys(loaded.state.trackVersions.byId).length,32);assert.deepEqual(loaded.state.tournaments,h.state.tournaments);
 const resumed=harness(h.state),oldArchive=resumed.state.trackVersions;resumed.tick(at+1);resumed.deliver();assert.equal(resumed.state.trackVersions,oldArchive,'reloading a populated archive does not clone its frozen records back');
 const archives=preparePcSaveArchives(h.state,['trackVersions','judging']);primePcSaveArchives(h.storage,archives);assert.equal(saveVirtualPcState(h.storage,{...h.state,lastGameMinute:at+1}),true);
 const raw=h.storage.getItem(VIRTUAL_PC_STORAGE_KEY);h.storage.setItem=()=>{throw Error('quota');};assert.equal(saveVirtualPcState(h.storage,{...h.state,lastGameMinute:at+2}),false);assert.equal(h.storage.getItem(VIRTUAL_PC_STORAGE_KEY),raw);
});
