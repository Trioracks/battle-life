import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {freshDemo,runDemo,BATTLE} from './helpers/package-two-fixture.js';
import {createVirtualPcState,loadVirtualPcState,saveVirtualPcState,VIRTUAL_PC_STORAGE_KEY} from '../src/virtual-pc-state.js';
import {ensureTournament} from '../src/battle-tournament.js';
import {publicRoundAnnouncements} from '../src/round-topics.js';
import {sentFixture} from './social-judging-events.test.js';
import {advanceSocial} from '../src/social-runtime.js';
import {requestResultReaction,completeResultReaction} from '../src/social-result-reaction.js';
import {gameMinuteStamp} from '../src/game-minute.js';

for(const [name,damage]of [
 ['null event',t=>t.events.push(null)],
 ['missing current round',t=>{t.currentRoundId='round-2';}],
 ['invalid event time',t=>{t.events[0].dueAt=-1;}],
])test('damaged tournament '+name+' is isolated through loading, never reseeded',()=>{
 const s=freshDemo();s.projects=[{id:'keep-me'}];damage(s.tournaments.byId[BATTLE]);const raw=structuredClone(s.tournaments.byId[BATTLE]);
 const values=new Map([[VIRTUAL_PC_STORAGE_KEY,JSON.stringify(s)]]),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const loaded=loadVirtualPcState(storage);assert.equal(loaded.ok,true);assert.equal(loaded.state.projects[0].id,'keep-me');
 assert.equal(loaded.state.tournaments.byId[BATTLE],undefined);assert.deepEqual(loaded.state.tournaments.recovery[0].recoveryData,raw);
 assert.doesNotThrow(()=>publicRoundAnnouncements(loaded.state,{nowMinute:600}));assert.equal(ensureTournament(loaded.state,{battleId:BATTLE,nowMinute:600}).ok,false);
 assert.equal(saveVirtualPcState(storage,loaded.state),true);assert.deepEqual(loadVirtualPcState(storage).state.tournaments,loaded.state.tournaments);
});

test('the actual apartment scene completion publishes at the apartment date, not tomorrow',()=>{
 let state=runDemo({through:'selection'}).state;
 const event=state.socialRuntime.events.find(e=>e.type==='judge-panel-complete');state=requestResultReaction(state,event.id).state;
 const now=state.socialRuntime.lastMinute,homeTime={day:Math.floor(now/1440)+1,minutes:now%1440};let persisted;
 const context={pcState:state,homeTime,resultEpisode:{returning:true,reaction:state.resultReactions.items[0],ui:{restore(){}}},pcLifecycle:{snapshot:{phase:'desktop'}},completeResultReaction,gameMinuteStamp,persistPc:s=>(persisted=s,true),virtualPc:{syncState(){}},failedReactionId:null};
 const host=readFileSync(new URL('../src/apartment-app.js',import.meta.url),'utf8'),start=host.indexOf("    if(resultEpisode?.returning&&"),end=host.indexOf('    view.setComputerPresentation',start);
 assert.ok(start>0&&end>start);runInNewContext(host.slice(start,end),context);
 assert.equal(persisted.social.posts.at(-1).createdAt,now);assert.equal(persisted.resultReactions.items[0].status,'complete');assert.equal(context.resultEpisode,null);
});
