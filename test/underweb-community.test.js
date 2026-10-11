import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveUnderweb,desktopApps} from '../src/virtual-pc-catalog.js?rev=28';
import * as community from '../src/underweb-community.js?rev=28';
const savedReplies=count=>Array.from({length:count},(_,i)=>({id:'local-'+(i+1),topicId:'concrete-echo-general',author:'Игрок',body:'Сохранённый ответ '+(i+1),gameDay:1,quoteId:i?'local-1':null}));
test('the five hundredth reply is retained and a new reply at the limit is explicitly rejected',()=>{
 const state={replies:savedReplies(499)},last=community.replyToTopic(state,{topicId:'concrete-echo-general',author:'Игрок',body:'Ответ 500',quoteId:'local-1',gameDay:1});assert.equal(last.ok,true);assert.equal(last.community.replies.length,500);
 const full={...last.community,drafts:{'concrete-echo-general':{body:'Ответ 501',quoteId:'local-1'}}},attempt=community.replyToTopic(full,{topicId:'concrete-echo-general',author:'Игрок',body:'Ответ 501',quoteId:'local-1',gameDay:1});
 assert.equal(attempt.ok,false);assert.match(attempt.reason,/500/);assert.deepEqual(attempt.community,community.normalizeCommunity(full));assert.equal(attempt.community.replies[0].id,'local-1');assert.equal(attempt.community.replies.at(-1).quoteId,'local-1');
});
test('legacy saves above the forum limit keep every valid reply and quoted source',()=>{
 const existing=savedReplies(501),saved=community.normalizeCommunity(JSON.parse(JSON.stringify({replies:existing})));assert.equal(saved.replies.length,501);assert.deepEqual(saved.replies,existing);assert.equal(community.topicForDay('concrete-echo-general',1,saved).allPosts.find(p=>p.id==='local-1').body,'Сохранённый ответ 1');
 const attempt=community.replyToTopic(saved,{topicId:'concrete-echo-general',author:'Игрок',body:'Ещё',gameDay:1});assert.equal(attempt.ok,false);assert.equal(attempt.community.replies.length,501);
});

test('battle subpages resolve independently and an unknown subpage stays an error',()=>{
 for(const tab of ['home','rules','rounds','players']){
  const route=resolveUnderweb('underweb://battles/makarevich-1/'+tab,{gameDay:1});
  assert.equal(route.type,'battle');assert.equal(route.tab,tab);assert.equal(route.brief.id,'makarevich-1');
 }
 assert.equal(resolveUnderweb('underweb://battles/concrete-echo/no-such-tab').type,'error');
});
test('forum direct topic routes reject future topics and preserve page selection',()=>{
 assert.equal(resolveUnderweb('underweb://forum/topic/concrete-echo-round',{gameDay:1}).type,'error');
 const route=resolveUnderweb('underweb://forum/topic/concrete-echo-round?page=2',{gameDay:4});
 assert.equal(route.type,'forum-topic');assert.equal(route.topic.id,'concrete-echo-round');assert.equal(route.page,2);
 assert.equal(resolveUnderweb('underweb://forum/concrete-echo').type,'forum-board');
});
test('notebook download is searchable and its desktop app requires installation',()=>{
 assert.equal(resolveUnderweb('underweb://dump/notebook').topic,'notebook');
 assert.ok(resolveUnderweb('рэпблокнот').results.some(r=>r.url==='underweb://dump/notebook'));
 assert.equal(desktopApps({software:{notebook:{installed:false}}}).some(a=>a.id==='rap-notebook'),false);
 assert.equal(desktopApps({software:{notebook:{installed:true}}}).some(a=>a.id==='rap-notebook'),true);
});
test('forum excludes future seeded and saved replies and clamps pagination',()=>{
 assert.equal(typeof community.topicForDay,'function');
 const saved={replies:[{id:'local-1',topicId:'concrete-echo-general',author:'Игрок',body:'Ответ из будущего',gameDay:8}]};
 const early=community.topicForDay('concrete-echo-general',1,saved,999);
 assert.ok(early.posts.length>0);assert.ok(early.posts.every(p=>p.gameDay<=1));assert.equal(early.page,early.pages);assert.ok(!early.posts.some(p=>p.id==='local-1'));
 const late=community.topicForDay('concrete-echo-general',8,saved,999);assert.ok(late.posts.some(p=>p.id==='local-1'));
 assert.equal(community.topicForDay('concrete-echo-round',1,saved),null);
});
test('local replies survive JSON round trip, validate quotes and preserve inert text',()=>{
 assert.equal(typeof community.replyToTopic,'function');
 const first=community.topicForDay('concrete-echo-general',1).posts[0];
 const result=community.replyToTopic({}, {topicId:'concrete-echo-general',author:'Тест',body:'<img src=x onerror=alert(1)>',gameDay:1,quoteId:first.id});
 assert.equal(result.ok,true);const saved=community.normalizeCommunity(JSON.parse(JSON.stringify(result.community)));
 assert.equal(saved.replies[0].body,'<img src=x onerror=alert(1)>');assert.equal(saved.replies[0].quoteId,first.id);
 assert.equal(community.replyToTopic(saved,{topicId:'concrete-echo-general',body:' ',author:'Тест',gameDay:1}).ok,false);
 assert.equal(community.replyToTopic(saved,{topicId:'concrete-echo-round',body:'Привет',author:'Тест',gameDay:1}).ok,false);
 assert.equal(community.replyToTopic(saved,{topicId:'concrete-echo-general',body:'Привет',author:'Тест',gameDay:1,quoteId:'missing'}).ok,false);
});
test('community migration rejects malformed rows and retains bounded drafts and read dates',()=>{
 assert.equal(typeof community.normalizeCommunity,'function');
 const value=community.normalizeCommunity({replies:[null,{id:'bad',topicId:'missing',body:'x',author:'x',gameDay:1}],readTopics:{'concrete-echo-general':3,bad:1},drafts:{'concrete-echo-general':{body:'Черновик',quoteId:null},bad:{body:'x'}}});
 assert.deepEqual(value.replies,[]);assert.deepEqual(value.readTopics,{'concrete-echo-general':3});assert.deepEqual(value.drafts,{'concrete-echo-general':{body:'Черновик',quoteId:null}});
});
