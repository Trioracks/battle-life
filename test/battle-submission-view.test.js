import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {submitBattleTrack} from '../src/battle-submission.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
const api=await import('../src/battle-submission-view.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
function picker(seed=submissionFixture(),persist=true){
 assert.equal(typeof api.mountBattleSubmissionPicker,'function');
 const d=pcDocument(),root=d.createElement('section');let s=seed,day=1,closed=0;
 const view=api.mountBattleSubmissionPicker(root,{getState:()=>s,battleId:'makarevich-1',getGameDay:()=>day,onChange:n=>{if(persist)s=n;return persist;},onClose:()=>closed++});
 return {root,view,d,get state(){return s;},get closed(){return closed;},midnight(){day++;view.update();}};
}
test('off topic is nonblocking and midnight retains selection and focus',()=>{
 const f=picker(submissionFixture({battleId:null})),row=findButton(f.root,'Выбрать: Работа');row.click();row.focus();f.midnight();
 assert.equal(f.d.activeElement,row);assert.equal(row.getAttribute('aria-pressed'),'true');
 assert.ok(allPc(f.root).some(n=>n.textContent?.includes('другой темы')));
 findButton(f.root,'Отправить работу').click();assert.equal(f.state.battleSubmissions[0].topicMatch,false);assert.equal(f.closed,1);
});
test('cancel replacement preserves original and Escape never submits',()=>{
 const s=submitBattleTrack(submissionFixture(),{battleId:'makarevich-1',projectId:'beat',gameDay:1}).state;
 s.projects[1].name='Другая версия';const f=picker(s),before=structuredClone(f.state.battleSubmissions);
 findButton(f.root,'Выбрать: Другая версия').click();findButton(f.root,'Отправить работу').click();assert.ok(findButton(f.root,'Заменить работу'));
 fire(f.root,'keydown',{key:'Escape'});assert.equal(f.closed,1);assert.deepEqual(f.state.battleSubmissions,before);
});
test('empty or ineligible projects explain next step and storage error is not success',()=>{
 const empty=picker({...submissionFixture(),projects:[]});assert.ok(allPc(empty.root).some(n=>/готовый бит.*вокал/i.test(n.textContent)));
 const noVoice=picker(submissionFixture({vocal:false}));assert.ok(allPc(noVoice.root).some(n=>/черновую запись/.test(n.textContent)));assert.equal(findButton(noVoice.root,'Отправить работу').disabled,true);
 const failed=picker(submissionFixture(),false);findButton(failed.root,'Выбрать: Работа').click();findButton(failed.root,'Отправить работу').click();
 assert.equal(failed.closed,0);assert.equal(failed.state.battleSubmissions.length,0);assert.ok(allPc(failed.root).some(n=>/не сохранена/i.test(n.textContent)));
});
test('registered battle opens actual picker and persists pending, restoring battle focus',()=>{
 const d=pcDocument(),root=d.createElement('section'),pc=mountVirtualPc(root);pc.showDesktop(submissionFixture());pc.syncHost({gameDay:2,playerName:'Игрок'});pc.open('underweb');pc.navigateUnderweb('underweb://battles/makarevich-1');
 const action=findButton(root,'Добавить свою работу');assert.ok(action);action.click();findButton(root,'Выбрать: Работа').click();
 pc.syncHost({gameDay:3,playerName:'Игрок'});findButton(root,'Отправить работу').click();
 assert.equal(pc.state.battleSubmissions[0].status,'pending');assert.ok(findButton(root,'Заменить работу'));assert.equal(d.activeElement,findButton(root,'Заменить работу'));pc.dispose();
});
test('failed host persistence cannot publish even in memory',()=>{
 const d=pcDocument(),root=d.createElement('section'),pc=mountVirtualPc(root,{onPersist:()=>false});pc.showDesktop(submissionFixture());pc.syncHost({gameDay:1});pc.open('underweb');pc.navigateUnderweb('underweb://battles/makarevich-1');
 assert.ok(findButton(root,'Добавить свою работу'));findButton(root,'Добавить свою работу').click();findButton(root,'Выбрать: Работа').click();findButton(root,'Отправить работу').click();
 assert.equal(pc.state.battleSubmissions.length,0);pc.dispose();
});
