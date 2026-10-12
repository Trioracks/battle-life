import test from 'node:test';
import assert from 'node:assert/strict';
import {createResultPost,audienceResponse,POST_TEMPLATES,resultReactionContent} from '../src/social-wall.js';
import {JUDGE_COMMENTS} from '../src/judge-comments.js';
import {advanceSocial} from '../src/social-runtime.js';
import {sentFixture} from './social-judging-events.test.js';
test('a good numeric score cannot turn a critical or unknown review into praise',()=>{
 const bad=JUDGE_COMMENTS.find(t=>t.trigger.endsWith('.bad')),good=JUDGE_COMMENTS.find(t=>t.trigger.endsWith('.good'));
 const state={judging:{results:{review:{id:'review',personalQuality:7,grade:5.5,comment:'Звук тяжело слушать.',templateIds:[bad.id]}}}};
 for(const ids of [[bad.id],[]])for(let i=0;i<30;i++){
  state.judging.results.review.templateIds=ids;const content=resultReactionContent(state,{id:'panel-'+i,resultIds:['review']});
  assert.equal(content.hasPraise,false);assert.notEqual(content.mood,'joy');
 }
 state.judging.results.review={id:'review',personalQuality:2,grade:1.5,comment:good.text,templateIds:[good.id]};
 assert.equal(resultReactionContent(state,{id:'panel-0',resultIds:['review']}).hasPraise,true,'one genuine kind review can matter even with a poor total');
});
test('twenty contextual posts; one frozen audio attachment and actual judge quote, never guessed qualification',()=>{
 assert.ok(POST_TEMPLATES.length>=20);let s=sentFixture();s=advanceSocial(s,s.battleWindows[0].closesAt+4321).state;
 const event=s.socialRuntime.events.find(e=>e.type==='judge-panel-complete'),made=createResultPost(s,event.id);assert.equal(made.ok,true);
 const p=made.state.social.posts.at(-1);assert.equal(p.trackVersionId,s.battleSubmissions[0].trackVersionId);assert.ok(p.reviewId in s.judging.results);assert.ok(p.body.includes(s.judging.results[p.reviewId].comment));assert.ok(!/прош[её]л|вылетел|следующий раунд/.test(p.body));
 assert.deepEqual(createResultPost(made.state,event.id).state.social.posts,made.state.social.posts);
});
test('audience response follows saved audience, means around eight and one percent',()=>{
 let small={likes:0,comments:0},large={likes:0,comments:0};
 for(let i=0;i<100;i++){const a=audienceResponse(100,i),b=audienceResponse(1000,i);for(const key of ['likes','comments']){small[key]+=a[key];large[key]+=b[key];}}
 assert.ok(Math.abs(small.likes/100-8)<1);assert.ok(Math.abs(small.comments/100-1)<.3);assert.ok(large.likes>small.likes*8);assert.ok(large.comments>small.comments*8);
});
