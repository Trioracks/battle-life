import test from 'node:test';
import assert from 'node:assert/strict';
import * as archive from '../src/underweb-forum-archive.js';
import {COMMUNITY_BOARDS,topicForDay,normalizeCommunity,replyToTopic} from '../src/underweb-community.js';
import {createCommunityView} from '../src/underweb-community-view.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';

test('historical topics and individual posts follow the game calendar without leaking future dates',()=>{
 assert.equal(archive.archiveTopicForDay('albums-2012',60),null);
 const october=archive.archiveTopicForDay('albums-2012',61);
 assert.ok(october.posts.every(p=>p.date.startsWith('2012-10-31')));
 assert.ok(!archive.archiveTopicsForDay(null,1).some(t=>t.id==='albums-2012'));
 const winter=archive.archiveTopicForDay('repac-winner',1);
 assert.ok(winter.posts.some(p=>p.author==='OneShotForEnemy'&&p.date==='2012-02-03'));
 assert.ok(winter.allPosts.every(p=>p.sourceUrl.startsWith('https://')));
 assert.equal(archive.archiveTopicForDay('microphones-october',32).total,5);
 assert.equal(archive.archiveTopicForDay('microphones-october',34).total,8);
 assert.equal(archive.archiveTopicForDay('forum-quotes',1).total,3);
 assert.equal(archive.archiveTopicForDay('forum-quotes',9).total,4);
});

test('archive pagination clamps pages and preserves post provenance across pages',()=>{
 const first=archive.archiveTopicForDay('repac-winner',1,1),last=archive.archiveTopicForDay('repac-winner',1,999);
 assert.equal(first.page,1);assert.equal(last.page,last.pages);assert.ok(last.page>1);
 assert.ok(!first.posts.some(p=>last.posts.some(q=>p.id===q.id)));
 for(const p of last.posts)assert.ok(p.author&&p.date&&p.time&&p.sourceUrl&&['excerpt','paraphrase'].includes(p.kind));
});

test('local battle casts stay distinct and broad music boards do not masquerade as battle sites',()=>{
 const casts=['concrete-echo','open-mic-17','yard-cipher','makarevich-1'].map(id=>new Set(topicForDay(id+'-general',11).allPosts.map(p=>p.author)));
 for(let i=0;i<casts.length;i++)for(let j=i+1;j<casts.length;j++)assert.ok([...casts[i]].filter(name=>casts[j].has(name)).length<=1);
 for(const id of ['rap-talk','russian-rap','beatmaking','demo-room','graffiti','breaking','poetry','offtopic'])assert.ok(COMMUNITY_BOARDS.some(b=>b.id===id&&b.category!=='battles'));
});

test('expansion preserves original reply ids, quoted seed ids, drafts and read state on JSON restore',()=>{
 const old={replies:[{id:'local-44',topicId:'open-mic-17-round',author:'Игрок',body:'Мой ответ',gameDay:10,quoteId:'open-mic-17-round-1'}],drafts:{'makarevich-1-rules':{body:'Мой черновик',quoteId:'makarevich-1-rules-1'}},readTopics:{'yard-cipher-general':8}};
 const restored=normalizeCommunity(JSON.parse(JSON.stringify(old)));assert.deepEqual(restored.replies,old.replies);assert.deepEqual(restored.drafts,old.drafts);assert.deepEqual(restored.readTopics,old.readTopics);
 assert.ok(topicForDay('open-mic-17-round',10,restored).allPosts.some(p=>p.id==='open-mic-17-round-1'));
 assert.equal(replyToTopic(restored,{topicId:'repac-winner',author:'Игрок',body:'Нельзя писать в архив',gameDay:1}).ok,false);
});

test('historical archive navigation stays read-only and returns to local forum without changing saves',()=>{
 const d=pcDocument();let saved={community:{drafts:{'concrete-echo-general':{body:'Не потерять',quoteId:null}},replies:[]}},route={type:'forum-archive-topic',archiveTopicId:'repac-winner',page:1},navigated;
 const before=JSON.stringify(saved),render=()=>createCommunityView(d,{route,getState:()=>saved,getMetadata:()=>({gameDay:1}),onChange:s=>{saved=s;},navigate:url=>{navigated=url;}});
 const root=render();assert.ok(allPc(root).some(n=>n.textContent?.includes('Пересказ')));assert.ok(allPc(root).some(n=>n.tagName==='A'&&n.getAttribute('href')?.includes('hip-hop.ru')));
 assert.ok(!allPc(root).some(n=>n.tagName==='TEXTAREA'));
 const next=findButton(root,'Страница архива 2');assert.ok(next);next.click();assert.equal(navigated,'underweb://forum/archive/topic/repac-winner?page=2');
 const back=findButton(root,'Игровой форум');assert.ok(back);back.click();assert.equal(navigated,'underweb://forum');assert.equal(JSON.stringify(saved),before);
});
