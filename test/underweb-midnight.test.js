import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVirtualPc} from '../src/virtual-pc-ui.js?rev=28';
import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=28';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
function setup(){const d=pcDocument(),root=d.createElement('section'),pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}}});pc.showDesktop(createVirtualPcState({power:'on'}));pc.syncHost({gameDay:1,playerName:'Original'});pc.open('underweb');return {d,root,pc,day:day=>pc.syncHost({gameDay:day,playerName:'Original'})};}
const field=(s,label)=>allPc(s.root).find(n=>n.getAttribute?.('aria-label')===label);
test('midnight preserves forum reply focus and selection while revealing dated posts',()=>{
 const s=setup();s.pc.navigateUnderweb('underweb://forum/topic/concrete-echo-general');const before=field(s,'Ваш ответ');before.value='Pending text';fire(before,'input');before.focus();before.selectionStart=7;before.selectionEnd=11;before.selectionDirection='backward';
 s.day(2);const after=field(s,'Ваш ответ');assert.equal(after.value,'Pending text');assert.ok(s.d.activeElement===after,'Reply keeps focus');assert.equal(after.selectionStart,7);assert.equal(after.selectionEnd,11);assert.equal(after.selectionDirection,'backward');assert.ok(allPc(s.root).some(n=>n.textContent==='Текст есть. Только не надо опять мерить характер количеством хрипов в микрофон.'));s.pc.dispose();
});
test('midnight preserves a custom registration name and its selection',()=>{
 const s=setup();s.day(2);s.pc.navigateUnderweb('underweb://battles/concrete-echo');findButton(s.root,'Подать заявку').click();const input=field(s,'Имя участника');input.value='Custom';input.focus();input.selectionStart=1;input.selectionEnd=4;input.selectionDirection='forward';
 s.day(3);const after=field(s,'Имя участника');assert.equal(after.value,'Custom');assert.equal(s.d.activeElement,after);assert.equal(after.selectionStart,1);assert.equal(after.selectionEnd,4);findButton(s.root,'Подтвердить заявку').click();assert.equal(s.pc.state.battleApplications[0].nickname,'Custom');s.pc.dispose();
});
test('midnight keeps unfinished address and search inputs while replacing dated results',()=>{
 const s=setup();s.day(3);s.pc.navigateUnderweb('Dark Souls');const search=field(s,'Поиск Искры');search.value='Ещё не выполненный поиск';const address=field(s,'Адрес или поиск Underweb');address.value='underweb://forum/unfinished';address.focus();address.selectionStart=12;address.selectionEnd=14;
 s.day(4);assert.equal(field(s,'Поиск Искры').value,'Ещё не выполненный поиск');assert.equal(address.value,'underweb://forum/unfinished');assert.equal(s.d.activeElement,address);assert.equal(address.selectionStart,12);assert.equal(address.selectionEnd,14);s.pc.dispose();
});
test('date rollback removes future content even with a focused draft and does not steal outside focus',()=>{
 const s=setup();s.day(4);s.pc.navigateUnderweb('underweb://forum/topic/concrete-echo-round');const input=field(s,'Ваш ответ');input.value='Keep the draft';fire(input,'input');input.focus();s.day(1);assert.equal(s.pc.underwebView.snapshot.route.type,'error');assert.equal(field(s,'Ваш ответ'),undefined);assert.equal(s.pc.state.community.drafts['concrete-echo-round'].body,'Keep the draft');
 s.pc.navigateUnderweb('underweb://forum/topic/concrete-echo-general');const outside=s.d.createElement('button');outside.focus();s.day(2);assert.equal(s.d.activeElement,outside);s.pc.dispose();
});
