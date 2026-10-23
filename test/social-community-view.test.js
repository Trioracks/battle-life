import test from 'node:test';
import assert from 'node:assert/strict';
import {createSocialCommunityView} from '../src/social-community-view.js';
import {mountSocial} from '../src/social-view.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {ensureSocialReactionPlans} from '../src/social-reactions.js';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {tableFixture} from './helpers/tournament-table-fixture.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';

const has=(node,name)=>node.className?.split(' ').includes(name);
function community(state,nowMinute=600,uiState={}){
 const d=pcDocument(),visited=[],rows=[];
 const root=createSocialCommunityView(d,{id:'makarevich-1',getState:()=>state,getMetadata:()=>({gameMinutes:nowMinute,playerName:'Герой'}),navigate:url=>visited.push(url),commit(){},uiState,audio:{row(_d,options){rows.push(options.version?.id??options.item?.id);return d.createElement('div');}}});
 return {root,d,visited,rows};
}

test('community opens with a cover and keeps registration behind a saved subscription',()=>{
 const d=pcDocument(),root=d.createElement('div');let state=createVirtualPcState();
 const before=structuredClone(state.battleKnowledge);
 const view=mountSocial(root,{route:resolveSocialRoute('underweb://social/community/makarevich-1'),getState:()=>state,getMetadata:()=>({gameMinutes:600,playerName:'Герой'}),onChange:next=>{state=next;return true;},navigate(){}});
 const page=allPc(root).find(n=>has(n,'sn-community'));
 assert.ok(has(page.children[0],'sn-community-cover'),'the cover comes before the name and content');
 assert.equal(findButton(root,'Зарегистрироваться'),undefined);
 assert.ok(allPc(root).some(n=>n.textContent==='Первый сезон. Здесь принимают работы и отвечают на вопросы участников.'));
 findButton(root,'Подписаться').click();
 assert.deepEqual(state.social.subscriptions,['makarevich-1']);
 findButton(root,'Зарегистрироваться').click();
 assert.equal(state.battleApplications[0].nickname,'Герой');
 assert.ok(findButton(root,'Сдать трек'));
 assert.deepEqual(state.battleKnowledge,before);
 view.dispose();
});

test('community tables tab shows published rounds only and preserves its selection across rerender',()=>{
 const state=topicFixture(),t=state.tournaments.byId['makarevich-1'];
 t.rounds.final={...t.rounds['round-2'],roundId:'final',opensAt:30000,closesAt:40080};
 const uiState={},view=community(state,13440,uiState);
 const info=allPc(view.root).find(n=>n.dataset.communityPanel==='information'),tables=allPc(view.root).find(n=>n.dataset.communityPanel==='tables');
 assert.ok(info,'current information has its own tab panel');assert.ok(tables,'round tables have their own tab panel');
 assert.equal(info.hidden,false);assert.equal(tables.hidden,true);
 fire(findButton(view.root,'Таблицы раунда'),'click');
 assert.equal(uiState.tab,'tables');assert.equal(info.hidden,true);assert.equal(tables.hidden,false);
 assert.equal(findButton(view.root,'Таблицы раунда').getAttribute('aria-selected'),'true');
 const links=allPc(tables).filter(n=>n.tagName==='A');
 assert.deepEqual(links.map(n=>n.getAttribute('href')),['underweb://social/results/makarevich-1/selection','underweb://social/results/makarevich-1/round-2']);
 fire(links[1],'click');assert.equal(view.visited.at(-1),'underweb://social/results/makarevich-1/round-2');
 assert.equal(allPc(community(state,13441,uiState).root).find(n=>n.dataset.communityPanel==='tables').hidden,false);
 fire(findButton(view.root,'Актуальная информация'),'click');assert.equal(info.hidden,false);assert.equal(tables.hidden,true);
});

test('deadline and tournament eligibility still disable the subscribed community action',()=>{
 const state=ensureBattleWindow(createVirtualPcState(),{battleId:'makarevich-1',nowMinute:600}).state;
 state.social.subscriptions=['makarevich-1'];
 assert.equal(findButton(community(state,600).root,'Зарегистрироваться').disabled,false);
 assert.equal(findButton(community(state,10680).root,'Зарегистрироваться').disabled,true);
 state.battleApplications=[{battleId:'makarevich-1',nickname:'Герой'}];
 assert.equal(findButton(community(state,600).root,'Сдать трек').disabled,false);
 state.battleWindows[0]={...state.battleWindows[0],id:'makarevich-1:round-2:1',roundId:'round-2'};
 assert.equal(findButton(community(state,600).root,'Сдать трек').disabled,true,'a player outside the announced pairing cannot submit');
});

test('administrator posts keep live votes, separate comments and working rules links',()=>{
 const state=ensureSocialReactionPlans(topicFixture(),13440).state,view=community(state,13440);
 const pinned=allPc(view.root).find(n=>n.dataset.pinnedAnnouncement==='true');
 assert.ok(allPc(pinned).some(n=>has(n,'sn-avatar')));
 const post=allPc(view.root).find(n=>n.dataset.communityPost==='makarevich-1-welcome');
 assert.ok(allPc(post).some(n=>has(n,'sn-avatar')));
 assert.ok(findButton(post,'Нравится: 3'));
 assert.equal(allPc(post).filter(n=>has(n,'sn-comment-row')).length,1);
 assert.ok(allPc(post).some(n=>n.textContent==='2012-08-25'),'authored post date is retained');
 const rules=allPc(view.root).find(n=>n.tagName==='A'&&n.textContent==='Правила баттла');
 fire(rules,'click');assert.equal(view.visited.at(-1),'underweb://battles/makarevich-1/rules');
});

test('bottom audio library preserves the deadline and qualification publication boundary',()=>{
 const state=tableFixture();
 for(const id of ['player','mak-npc-01','mak-npc-02'])state.trackVersions.byId['track:'+id]={id:'track:'+id,npc:id!=='player'};
 state.communityAudio['makarevich-1']=['track:player','track:mak-npc-01','track:mak-npc-02'];
 const before=community(state,10679),after=community(state,12000);
 assert.deepEqual(before.rows.filter(id=>id?.startsWith('track:')),['track:player']);
 assert.deepEqual(after.rows.filter(id=>id?.startsWith('track:')),['track:player','track:mak-npc-01']);
 assert.ok(has(after.root.children.at(-1),'sn-community-archive'));
 assert.ok(allPc(after.root.children.at(-1)).some(n=>n.textContent==='Аудиотека'));
 assert.equal(after.rows.filter(id=>id?.endsWith('room-demo')).length,6,'the existing background archive is retained');
});
