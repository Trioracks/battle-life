import test from 'node:test';
import assert from 'node:assert/strict';
import {requestResultReaction,nextSafeResultReaction,completeResultReaction,normalizeResultReactions} from '../src/social-result-reaction.js';
import {advanceSocial} from '../src/social-runtime.js';
import {sentFixture} from './social-judging-events.test.js';
import {PcTransition} from '../src/virtual-pc-transition.js';
test('first full view queues one episode, busy blocks; reload and completion preserve work and post once',()=>{
 let state=sentFixture();state=advanceSocial(state,state.battleWindows[0].closesAt+4321).state;const event=state.socialRuntime.events.find(e=>e.type==='judge-panel-complete');
 const before=JSON.stringify(state.projects),first=requestResultReaction(state,event.id);assert.equal(first.ok,true);state=first.state;
 assert.equal(nextSafeResultReaction(state,{atDesktop:true,creativeJob:{},transitionPhase:'working'}),null);
 assert.equal(nextSafeResultReaction(state,{atDesktop:false,creativeJob:null,transitionPhase:'desktop'}),null);
 const reaction=nextSafeResultReaction(state,{atDesktop:true,creativeJob:null,transitionPhase:'desktop'});assert.ok(reaction);assert.deepEqual(normalizeResultReactions(JSON.parse(JSON.stringify(state.resultReactions))),state.resultReactions);
 const completed=completeResultReaction(state,reaction.id);assert.equal(completed.state.social.posts.length,1);assert.equal(JSON.stringify(completed.state.projects),before);
 assert.deepEqual(requestResultReaction(completed.state,event.id).state.resultReactions,completed.state.resultReactions);assert.equal(completeResultReaction(completed.state,reaction.id).state.social.posts.length,1);
});
test('reaction has its own camera phases and never enters creative working',()=>{
 const transition=new PcTransition();transition.enter({alreadyOn:true});transition.tick(3);transition.drainEvents();
 assert.equal(transition.react(),true);assert.equal(transition.snapshot.phase,'reaction-out');transition.tick(3);assert.equal(transition.snapshot.phase,'reaction-speaking');assert.equal(transition.snapshot.workActor,true);
 assert.equal(transition.finishReaction(),true);transition.tick(3);assert.equal(transition.snapshot.phase,'desktop');assert.ok(!transition.drainEvents().some(e=>e.type==='work-scene'||e.type==='work-camera'));
});
