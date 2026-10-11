import test from 'node:test';
import assert from 'node:assert/strict';
import {mountUnderweb} from '../src/underweb-view.js?rev=27';
import {pcDocument,findButton,allPc,fire} from './helpers/virtual-pc-dom.js';
const click=(root,name)=>{const b=findButton(root,name);assert.ok(b,'Missing '+name);b.click();};
function setup(seed={}){const d=pcDocument(),root=d.createElement('div');let state={battleApplications:[],...seed},day=1;const view=mountUnderweb(root,{getState:()=>state,getMetadata:()=>({gameDay:day,playerName:'Проверка'}),onChange:s=>{state=s;},onApply:(id,nickname)=>{state={...state,battleApplications:[{battleId:id,nickname}]};}});return {root,d,view,get state(){return state;},set day(v){day=v;}};}
test('standalone sites expose working tabs, themed identities and local registration',()=>{
 const s=setup();s.view.navigate('underweb://battles/makarevich-1');
 for(const tab of ['Правила','Раунды','Участники']){click(s.root,tab);assert.equal(s.view.snapshot.route.type,'battle');}
 click(s.root,'Главная');click(s.root,'Подать заявку');click(s.root,'Подтвердить заявку');assert.equal(s.state.battleApplications[0].battleId,'makarevich-1');
 click(s.root,'Обсуждение на форуме');assert.equal(s.view.snapshot.route.type,'forum-board');s.view.dispose();
});
test('forum saves draft, quotes safely, posts and restores the reply after remount',()=>{
 const s=setup();s.view.navigate('underweb://forum/topic/concrete-echo-general');assert.ok(allPc(s.root).some(n=>n.textContent?.includes('Вымышленный игровой форум')));click(s.root,'Цитировать сообщение 1');
 const input=allPc(s.root).find(n=>n.getAttribute?.('aria-label')==='Ваш ответ');assert.ok(input);input.value='<script>window.bad=true</script>';fire(input,'input');assert.equal(s.state.community.drafts['concrete-echo-general'].body,input.value);
 click(s.root,'Отправить ответ');assert.equal(s.state.community.replies.length,1);assert.ok(s.state.community.replies[0].quoteId);assert.equal(allPc(s.root).filter(n=>n.tagName==='SCRIPT').length,0);
 const restored=setup(JSON.parse(JSON.stringify(s.state)));restored.view.navigate('underweb://forum/topic/concrete-echo-general?page=999');assert.ok(allPc(restored.root).some(n=>n.textContent==='<script>window.bad=true</script>'));s.view.dispose();restored.view.dispose();
});
test('daily refresh updates visible discussion without losing a reply draft',()=>{
 const s=setup();s.view.navigate('underweb://forum/topic/concrete-echo-general');const input=allPc(s.root).find(n=>n.getAttribute?.('aria-label')==='Ваш ответ');assert.ok(input);input.value='Не потеряй этот текст';fire(input,'input');
 s.day=8;s.view.update();assert.equal(allPc(s.root).find(n=>n.getAttribute?.('aria-label')==='Ваш ответ').value,'Не потеряй этот текст');s.view.navigate('underweb://forum/topic/concrete-echo-round');assert.equal(s.view.snapshot.route.type,'forum-topic');s.day=1;s.view.update();assert.equal(s.view.snapshot.route.type,'error');s.view.dispose();
});
