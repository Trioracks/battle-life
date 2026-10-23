import test from 'node:test';
import assert from 'node:assert/strict';
import {mountUnderweb} from '../src/underweb-view.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {createPostReactionsView} from '../src/social-reactions-view.js';
import {publicPostReactions,planPostReactions} from '../src/social-reactions.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';

test('Iskra search leads to one news feature, then the first social shortcut',()=>{
 const d=pcDocument(),root=d.createElement('main');let state=createVirtualPcState();
 const browser=mountUnderweb(root,{getState:()=>state,getMetadata:()=>({gameDay:1,gameMinutes:600}),onChange:s=>{state=s;return true;}});
 const nodes=allPc(root),news=nodes.filter(n=>n.className==='uw-news-panel'),tiles=nodes.filter(n=>n.className?.split(' ').includes('uw-site-tile'));
 assert.equal(news.length,1);assert.ok(tiles.length>=4);assert.ok(nodes.indexOf(nodes.find(n=>n.className==='uw-search-form'))<nodes.indexOf(news[0]));assert.ok(nodes.indexOf(news[0])<nodes.indexOf(tiles[0]));
 assert.equal(tiles[0].getAttribute('aria-label'),'В кругу — найди друзей и одноклассников');tiles[0].click();assert.equal(browser.snapshot.route.section,'me');browser.dispose();
});

test('battle group pins only its current announcement and puts authored wall before archive',()=>{
 const d=pcDocument(),root=d.createElement('main');let state=ensureBattleWindow(createVirtualPcState(),{battleId:'makarevich-1',nowMinute:600}).state;
 const browser=mountUnderweb(root,{getState:()=>state,getMetadata:()=>({gameDay:1,gameMinutes:601,playerName:'Герой'}),onChange:s=>{state=s;return true;}});browser.navigate('underweb://social/community/makarevich-1');
 const nodes=allPc(root),pinned=nodes.filter(n=>n.dataset?.pinnedAnnouncement==='true'),wall=nodes.find(n=>n.getAttribute('aria-label')==='Стена группы'),archive=nodes.find(n=>n.getAttribute('aria-label')==='Аудиотека группы');
 assert.equal(pinned.length,1);assert.match(allPc(pinned[0]).map(n=>n.textContent??'').join(' '),/до/);assert.ok(wall);assert.ok(archive);assert.ok(nodes.indexOf(pinned[0])<nodes.indexOf(wall));assert.ok(nodes.indexOf(wall)<nodes.indexOf(archive));
 assert.ok(nodes.some(n=>n.tagName==='IMG'&&new URL(n.getAttribute('src'),'http://fixture/').pathname.endsWith('/assets/battle-covers/mak-cover-01.png')));assert.equal(findButton(root,'Изучить площадку'),undefined);
 const links=nodes.filter(n=>n.tagName==='A');assert.ok(links.some(n=>n.textContent==='Правила баттла'));
 const information=nodes.find(n=>n.dataset?.communityPanel==='information'),tables=nodes.find(n=>n.dataset?.communityPanel==='tables');assert.equal(information.hidden,false);assert.equal(tables.hidden,true);
 findButton(root,'Таблицы раунда').click();assert.equal(information.hidden,true);assert.equal(tables.hidden,false);assert.ok(allPc(tables).some(n=>n.tagName==='A'&&n.getAttribute('href')==='underweb://social/results/makarevich-1/selection'));
 findButton(root,'Актуальная информация').click();assert.equal(information.hidden,false);assert.equal(tables.hidden,true);assert.ok(findButton(root,'Мои группы'));browser.dispose();
});

test('thumb votes show counts, describe their action and persist a switch',()=>{
 const d=pcDocument(),plan=planPostReactions({postId:'post',context:'round-theme',startAt:1,audience:20,hype:20,seed:1});let state={socialReactions:{version:1,plans:{post:plan},votes:{},history:[]}};
 const root=createPostReactionsView(d,{postId:'post',state,getState:()=>state,nowMinute:20000,commit:r=>{state=r.state;return true;}}),nodes=allPc(root),like=nodes.find(n=>n.tagName==='BUTTON'&&n.getAttribute('aria-label')?.startsWith('Нравится:'));
 assert.ok(like);assert.ok(allPc(like).some(n=>n.tagName==='SVG'&&n.getAttribute('aria-hidden')==='true'));assert.ok(allPc(like).some(n=>n.textContent===String(publicPostReactions(plan,20000).likes)));like.click();assert.equal(state.socialReactions.votes.post,'like');
 const dislike=nodes.find(n=>n.tagName==='BUTTON'&&n.getAttribute('aria-label')?.startsWith('Не нравится:'));assert.ok(dislike);dislike.click();assert.equal(state.socialReactions.votes.post,'dislike');
});
test('pinned announcement can collapse its discussion while retaining every published comment',()=>{
 const d=pcDocument(),plan=planPostReactions({postId:'post',context:'round-theme',startAt:1,audience:20,hype:100,seed:1,eventFacts:['round_theme_published'],activeAuthors:[{id:'reader',name:'Читатель',maxIntensity:3}]}),state={socialReactions:{version:1,plans:{post:plan},votes:{},history:[]}},root=createPostReactionsView(d,{postId:'post',state,nowMinute:20000,collapseComments:true}),thread=allPc(root).find(n=>n.tagName==='DETAILS');
 assert.ok(plan.comments.length>0);assert.ok(thread);assert.equal(Boolean(thread.open),false);assert.deepEqual(allPc(thread).filter(n=>n.tagName==='P').map(n=>n.textContent),publicPostReactions(plan,20000).comments.map(c=>c.body));
});
