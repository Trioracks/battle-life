import test from 'node:test';
import assert from 'node:assert/strict';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {subscribeCommunity,normalizeSocial} from '../src/social-state.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createSocialBackground} from '../src/social-background.js';
import {mountSocial} from '../src/social-view.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {pcDocument,allPc,fire} from './helpers/virtual-pc-dom.js';
import {ensureSocialReactionPlans} from '../src/social-reactions.js';
const api=await import('../src/social-community-publications.js').catch(()=>({}));
const id='makarevich-1',opts=nowMinute=>({communityId:id,nowMinute});
test('subscription baselines history, two new posts yield two durable phone IDs, read retires only group notices',()=>{
 assert.equal(typeof api.communityUnreadCounts,'function');
 let s=subscribeCommunity(topicFixture(),id,true,{nowMinute:13440}).state;
 assert.equal(api.communityUnreadCounts(s,{nowMinute:13440}).total,0);
 s=api.publishCommunityNotices(s,19920).state;
 assert.equal(api.communityUnreadCounts(s,{nowMinute:19920}).total,2);
 assert.equal(s.phone.queue.filter(e=>e.type==='community-post').length,2);
 const ids=s.phone.queue.map(e=>e.id);assert.equal(new Set(ids).size,2);
 s=api.publishCommunityNotices(createVirtualPcState(s),19920).state;assert.deepEqual(s.phone.queue.map(e=>e.id),ids);
 s.phone.queue.push({id:'personal',type:'personal-message',source:'social',sender:'Друг',text:'Привет',dueAt:19920});
 s=api.markCommunitySeen(s,opts(19920)).state;
 assert.equal(api.communityUnreadCounts(s,{nowMinute:19920}).total,0);
 assert.deepEqual(s.phone.queue.map(e=>e.id),['personal']);assert.ok(ids.every(id=>s.phone.dismissedIds.includes(id)));
 assert.equal(api.markCommunitySeen(s,opts(19920)).state,s);
 assert.deepEqual(api.publishCommunityNotices(s,19920).state.phone.queue.map(e=>e.id),['personal']);
 const unsub=api.publishCommunityNotices(topicFixture(),23519).state;assert.equal(unsub.phone.queue.filter(e=>e.type==='community-post').length,0);
});
test('same-minute IDs remain unread until displayed; marks survive normalization and stale Worker replies',()=>{
 assert.equal(typeof api.markCommunitySeen,'function');
 let state=subscribeCommunity(topicFixture(),id,true,{nowMinute:13439}).state;
 state=api.markCommunitySeen(state,opts(13440)).state;
 state.tournaments.byId[id].bracket={mode:'neighbors'};
 assert.equal(api.communityUnreadCounts(state,{nowMinute:13440}).total,1);
 let worker,saves=0;const bg=createSocialBackground({getState:()=>state,persist:()=>{saves++;return true;},onState:s=>state=s,createWorker:()=>worker={postMessage(m){this.job=m;},terminate(){}}});
 bg.tick(13440,{},0);const old=state;state=api.markCommunitySeen(state,opts(13440)).state;
 worker.onmessage({data:{id:worker.job.id,patch:{social:old.social},durable:true}});
 assert.equal(saves,0);assert.equal(api.communityUnreadCounts(state,{nowMinute:13440}).total,0);
 assert.deepEqual(normalizeSocial(state.social).communityReads,state.social.communityReads);bg.dispose();
});
test('visible community clears unread; hidden view does not; dialog header/name/avatar use typed routes',()=>{
 assert.equal(typeof api.communityUnreadCounts,'function');
 let state=subscribeCommunity(topicFixture(),id,true,{nowMinute:13439}).state,visible=false,address='',now=13440;
 const d=pcDocument(),root=d.createElement('main');
 const make=path=>mountSocial(root,{route:resolveSocialRoute('underweb://social/'+path),getState:()=>state,getMetadata:()=>({gameMinutes:now,playerName:'Макаревич Battle'}),onChange:s=>{state=s;return true;},navigate:url=>address=url,isVisible:()=>visible});
 let view=make('community/'+id);view.update();assert.equal(api.communityUnreadCounts(state,{nowMinute:now}).total,1);visible=true;view.update();assert.equal(api.communityUnreadCounts(state,{nowMinute:now}).total,0);view.dispose();
 state.social.dialogs[id]={peer:{kind:'community',id},messages:[{id:'self',sender:'player',body:'Я',at:100},{id:'admin',sender:id,body:'Организаторы',at:101}]};
 for(const [path,expected]of [['dialog/'+id,'underweb://social/community/'+id],['dialog/anya','underweb://social/profile/anya']]){
  view=make(path);const links=allPc(root).filter(n=>n.tagName==='A');assert.ok(links.filter(n=>n.getAttribute('href')===expected).length>=3);
  for(const link of links){fire(link,'click');assert.equal(address,link.getAttribute('href'));}
  assert.ok(links.some(n=>n.getAttribute('href')==='underweb://social/profile/me'));view.dispose();
 }
});
test('static wall keeps authored chronology and does not invent dates for old comments',()=>{
 const d=pcDocument(),root=d.createElement('main');let state=ensureSocialReactionPlans(topicFixture(),13440).state;
 const view=mountSocial(root,{route:resolveSocialRoute('underweb://social/community/'+id),getState:()=>state,getMetadata:()=>({gameMinutes:13440}),onChange:s=>{state=s;return true;},navigate:()=>{}});
 const staticThreads=allPc(root).filter(n=>n.dataset?.reactionPost?.startsWith('makarevich-1-'));
 assert.deepEqual(staticThreads.map(n=>n.dataset.reactionPost),['makarevich-1-before','makarevich-1-welcome']);
 assert.equal(allPc(staticThreads[1]).some(n=>n.tagName==='SMALL'&&/2012/.test(n.textContent)),false);view.dispose();
});
test('published judge name itself is a semantic profile link inside the announcement text',()=>{
 const d=pcDocument(),root=d.createElement('main');let state=ensureSocialReactionPlans(topicFixture(),19920).state;
 const view=mountSocial(root,{route:resolveSocialRoute('underweb://social/community/'+id),getState:()=>state,getMetadata:()=>({gameMinutes:19920}),onChange:s=>{state=s;return true;},navigate:()=>{}});
 const announcement=allPc(root).find(n=>n.dataset?.reactionPost==='announce:judge:eparhiya').parentElement;
 const link=allPc(announcement.children[2]).find(n=>n.tagName==='A');assert.ok(link);assert.equal(link.textContent,'епархия');assert.equal(link.getAttribute('href'),'underweb://social/profile/eparhiya');view.dispose();
});
