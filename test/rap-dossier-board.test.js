import test from 'node:test';
import assert from 'node:assert/strict';
import {mountRapDossier} from '../src/rap-dossier-view.js';
import {dossierBoardLayout} from '../src/rap-dossier-board-view.js';
import {startTrackStudy,advanceStudy} from '../src/rap-analysis.js';
import {analysisFixture,studySkills} from './helpers/analysis-fixture.js';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
const nodes=root=>allPc(root).filter(n=>n.dataset?.dossierNode);
function setup(state=analysisFixture(),options={}){
 let minute=13440,visible=true,work=0;const d=pcDocument(),root=d.createElement('main');
 const ui=mountRapDossier(root,{getState:()=>state,getMetadata:()=>({gameMinutes:minute,skills:studySkills(60)}),commit:r=>{if(options.fail)return false;state=r.state;return true;},onWork:()=>{work++;return true;},isVisible:()=>visible});
 return {root,d,ui,get state(){return state;},get work(){return work;},time:n=>{minute=n;},visible:v=>{visible=v;}};
}
function battle(){const s=topicFixture();s.software.dossier.installed=true;s.music.needs={satiety:100,energy:100};s.trackVersions=analysisFixture().trackVersions;s.battleSubmissions=[{id:'submission',battleId:'makarevich-1',roundId:'round-2',trackVersionId:'weak',sentAt:13440}];return s;}
test('battle graph renders connected folders and forecast below submitted recording',()=>{
 const x=setup(battle());x.ui.focusTarget({caseId:'battle:makarevich-1'});
 const track=nodes(x.root).find(n=>n.dataset.dossierNode==='track:weak'),forecast=nodes(x.root).find(n=>n.dataset.dossierNode.startsWith('forecast:')&&n.dataset.dossierNode.endsWith(':weak'));
 assert.ok(nodes(x.root).some(n=>n.dataset.dossierNode==='battle:makarevich-1'));
 assert.ok(nodes(x.root).some(n=>n.dataset.dossierNode==='round:makarevich-1:round-2'));
 assert.ok(Number(forecast.dataset.boardY)>Number(track.dataset.boardY));assert.equal(forecast.dataset.boardX,track.dataset.boardX);
 assert.ok(allPc(x.root).some(n=>n.tagName==='LINE'&&n.getAttribute('data-edge-kind')==='forecast'));x.ui.dispose();
});
test('selected immutable recording starts study with click-time metadata; failed persistence cannot launch work',()=>{
 for(const fail of [false,true]){const x=setup(battle(),{fail});x.ui.focusTarget({caseId:'battle:makarevich-1',trackVersionId:'weak'});x.time(13450);findButton(x.root,'Изучить трек · 45 мин').click();
 assert.equal(x.work,fail?0:1);if(!fail){assert.equal(x.state.rapAnalysis.job.trackVersionId,'weak');assert.equal(x.state.rapAnalysis.job.startedAt,13450);}x.ui.dispose();}
});
test('empty and unavailable cases are explicit and case selector switches without stale detail',()=>{
 const x=setup();assert.ok(allPc(x.root).some(n=>n.textContent?.includes('Пока нет записей')));x.ui.focusTarget({caseId:'battle:missing'});assert.ok(allPc(x.root).some(n=>n.textContent==='Дело недоступно'));assert.equal(findButton(x.root,'Изучить трек · 45 мин'),undefined);x.ui.dispose();
});
test('display ticks keep focused cards and hidden view untouched; disposal retires actions',()=>{
 const x=setup(battle());x.ui.focusTarget({caseId:'battle:makarevich-1'});const card=nodes(x.root).find(n=>n.dataset.dossierNode==='track:weak');card.focus();
 for(let i=0;i<100;i++){x.time(13440+i/1000);x.ui.update();}assert.equal(x.d.activeElement,card);assert.ok(nodes(x.root).includes(card));
 x.visible(false);x.time(15000);x.ui.update();assert.ok(nodes(x.root).includes(card));x.visible(true);x.ui.update();
 x.ui.dispose();card.click();assert.equal(x.root.children.length,0);assert.equal(x.work,0);
});
test('node selection and fit keep a usable board',()=>{
 const x=setup(battle());x.ui.focusTarget({caseId:'battle:makarevich-1'});const card=nodes(x.root).find(n=>n.dataset.dossierNode==='track:weak');card.click();
 assert.ok(allPc(x.root).some(n=>n.getAttribute('aria-label')==='Детали: Первая демка'));findButton(x.root,'Вписать доску').click();assert.ok(nodes(x.root).length>2);x.ui.dispose();
});

test('study progress preserves keyboard focus while its elapsed label advances',()=>{
 const x=setup(battle());x.ui.focusTarget({trackVersionId:'weak'});findButton(x.root,'Изучить трек · 45 мин').click();const pause=findButton(x.root,'Пауза');pause.focus();x.state.rapAnalysis.job.elapsed=5;x.ui.update();assert.equal(x.d.activeElement,pause);assert.ok(allPc(x.root).some(n=>n.textContent?.includes('5 / 45')));x.ui.dispose();
});

test('several round forecasts for one submitted version have separate paper slots beneath the track',()=>{
 const graph={id:'battle:test',nodes:[{id:'track:a',kind:'track'},{id:'track:b',kind:'track'},...['f1','f2'].map(id=>({id,kind:'forecast',layout:{parentId:'track:a'}}))]},p=dossierBoardLayout(graph).positions;
 assert.ok(p.get('f2').y>=p.get('f1').y+p.get('f1').height);assert.ok(p.get('track:b').y>=p.get('f2').y+p.get('f2').height);
});

test('choosing a saved report keeps keyboard focus on its report selector',()=>{
 const state=advanceStudy(startTrackStudy(analysisFixture(),{trackVersionId:'weak',heroSnapshot:studySkills(40),nowMinute:100}).state,{gameMinutes:45,nowMinute:145}).state,x=setup(state),button=findButton(x.root,'Первая демка · study:1');button.focus();button.click();assert.equal(x.d.activeElement?.textContent,'Первая демка · study:1');x.ui.dispose();
});
