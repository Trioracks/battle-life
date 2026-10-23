import test from 'node:test';
import assert from 'node:assert/strict';
import {pcFocusable} from '../src/virtual-pc-dom.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
import {submissionFixture,exportedSubmissionFixture,completeSubmissionUpload} from './helpers/submission-fixtures.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {mountBattleSubmissionPicker} from '../src/battle-submission-view.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {advanceSocial} from '../src/social-runtime.js';
function picker(seed=exportedSubmissionFixture(),persist=true){
 const d=pcDocument(),root=d.createElement('section');let s=ensureBattleWindow(seed,{battleId:'makarevich-1',nowMinute:600}).state,minute=601,closed=0;
 const view=mountBattleSubmissionPicker(root,{getState:()=>s,battleId:'makarevich-1',getGameMinute:()=>minute,onChange:n=>{if(persist)s=n;return persist;},onClose:()=>closed++});
 return {root,view,d,get state(){return s;},get closed(){return closed;},tick(){minute++;view.update();}};
}
test('attachment picker preserves focus across ticks and does not send off-topic work',()=>{
 const off=picker(exportedSubmissionFixture({battleId:null}));assert.equal(findButton(off.root,'Выбрать: submission-file.wav'),undefined);assert.equal(findButton(off.root,'Прикрепить').disabled,true);
 const f=picker(),row=findButton(f.root,'Выбрать: submission-file.wav');row.click();row.focus();f.tick();assert.equal(f.d.activeElement,row);assert.equal(row.getAttribute('aria-pressed'),'true');findButton(f.root,'Прикрепить').click();assert.equal(f.state.battleSubmissions.length,0);assert.equal(f.state.outgoingUpload.status,'uploading');assert.equal(f.closed,1);
});
test('Escape cancels attachment; no replacement button; quota failure is not success',()=>{
 const f=picker();fire(allPc(f.root).find(n=>n.className==='pc-file-picker'),'keydown',{key:'Escape'});assert.equal(f.closed,1);assert.equal(f.state.social.personalAudioIds.length,0);assert.equal(findButton(f.root,'Заменить работу'),undefined);
 const failed=picker(exportedSubmissionFixture(),false);findButton(failed.root,'Выбрать: submission-file.wav').click();findButton(failed.root,'Прикрепить').click();assert.equal(failed.closed,0);assert.equal(failed.state.social.personalAudioIds.length,0);assert.ok(allPc(failed.root).some(n=>/не сохранено/.test(n.textContent)));
});
test('picker shows folders and immutable metadata, lists eligible tracks, and traps keyboard focus',()=>{
 let state=exportedSubmissionFixture();for(const kind of ['beat','vocal'])state=createAudioExport(state,{id:kind,projectId:'beat',kind,folderId:'exports',filename:kind,nowMinute:600}).state;
 const f=picker(state),folder=allPc(f.root).find(n=>n.getAttribute('aria-label')==='Папка файла');
 assert.equal(f.d.activeElement,folder);assert.equal(folder.value,'exports');assert.equal(findButton(f.root,'Выбрать: beat.wav'),undefined);assert.equal(findButton(f.root,'Выбрать: vocal.wav'),undefined);
 findButton(f.root,'Выбрать: submission-file.wav').click();assert.ok(allPc(f.root).some(n=>n.textContent?.includes('1881644 байт')));assert.ok(allPc(f.root).some(n=>n.textContent?.includes(state.audioExports.files[0].trackVersionId)));
 folder.value='projects';fire(folder,'change');assert.equal(findButton(f.root,'Выбрать: Работа.flp'),undefined);assert.equal(findButton(f.root,'Прикрепить').disabled,true);
 const cancel=findButton(f.root,'Отмена');cancel.focus();fire(allPc(f.root).find(n=>n.className==='pc-file-picker'),'keydown',{key:'Tab'});assert.ok(f.d.activeElement===pcFocusable(allPc(f.root).find(n=>n.className==='pc-file-picker'))[0]);
 const empty=picker(submissionFixture());assert.ok(allPc(empty.root).some(n=>/экспорт.*полный трек/i.test(n.textContent)));assert.equal(findButton(empty.root,'Прикрепить').disabled,true);
});
function pcFixture(fail=false){
 const d=pcDocument(),root=d.createElement('section'),pc=mountVirtualPc(root,{onPersist:()=>!fail});pc.showDesktop(exportedSubmissionFixture());pc.syncHost({gameDay:1,gameMinutes:600,playerName:'Игрок'});pc.open('underweb');pc.navigateUnderweb('underweb://battles/makarevich-1');
 return {d,root,pc};
}
test('actual browser goes from battle to dialog, attaches, sends once and receives persisted ack',()=>{
 const {root,pc}=pcFixture();findButton(root,'Открыть сообщения сообщества').click();findButton(root,'Прикрепить').click();findButton(root,'Выбрать: submission-file.wav').click();findButton(allPc(root).find(n=>n.className==='pc-file-picker'),'Прикрепить').click();
 assert.equal(pc.state.battleSubmissions.length,0);assert.equal(pc.state.social.personalAudioIds.length,0);assert.equal(findButton(root,'Отправить').disabled,true);pc.syncState(completeSubmissionUpload(pc.state));assert.equal(pc.state.social.personalAudioIds.length,1);findButton(root,'Ответить').click();findButton(root,'Отправить работу на баттл').click();assert.equal(pc.state.battleSubmissions.length,0);pc.tickOutgoingMessage(6,{paused:false});findButton(root,'Отправить').click();assert.equal(pc.state.battleSubmissions.length,1);
 const row=pc.state.battleSubmissions[0];pc.state=advanceSocial(pc.state,row.ackAt).state;pc.syncHost({gameDay:1,gameMinutes:row.ackAt,playerName:'Игрок'});
 assert.ok(allPc(root).some(n=>n.textContent?.includes('Работа принята.')));assert.equal(findButton(root,'Отправить').disabled,true);assert.equal(findButton(root,'Заменить работу'),undefined);pc.dispose();
});
test('failed host persistence cannot publish even in memory',()=>{
 const {root,pc}=pcFixture(true);findButton(root,'Открыть сообщения сообщества').click();
 assert.equal(findButton(root,'Прикрепить').disabled,true);assert.equal(pc.state.battleSubmissions.length,0);pc.dispose();
});
