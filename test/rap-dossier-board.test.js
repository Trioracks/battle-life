import test from 'node:test';
import assert from 'node:assert/strict';
import {mountRapDossier} from '../src/rap-dossier-view.js';
import {dossierBoardLayout} from '../src/rap-dossier-board-view.js';
import {startTrackStudy,advanceStudy,pauseStudy} from '../src/rap-analysis.js';
import {startCaseStudy,advanceCaseStudy,pauseCaseStudy} from '../src/rap-research.js';
import {analysisFixture,studySkills} from './helpers/analysis-fixture.js';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
const nodes=root=>allPc(root).filter(n=>n.dataset?.dossierNode);
function setup(state=analysisFixture(),options={}){
 let minute=13440,visible=true,work=0;const d=pcDocument(),root=d.createElement('main');
 const ui=mountRapDossier(root,{getState:()=>state,getMetadata:()=>({gameMinutes:minute,skills:studySkills(60)}),commit:r=>{if(options.fail)return false;state=r.state;return true;},onWork:()=>{work++;return true;},isVisible:()=>visible});
 return {root,d,ui,get state(){return state;},get work(){return work;},replaceState:s=>{state=s;},time:n=>{minute=n;},visible:v=>{visible=v;}};
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

test('battle is upper-central and desktop fit centers the composition in spare space',()=>{
 const graph={id:'battle:test',nodes:['battle','round','judge','opponent','track'].map(kind=>({id:kind,kind}))},layout=dossierBoardLayout(graph),battleCard=layout.positions.get('battle');
 assert.equal(battleCard.x+battleCard.width/2,layout.width/2);
 for(const [id,p]of layout.positions)if(id!=='battle')assert.ok(battleCard.y+battleCard.height<=p.y);
 const x=setup(battle());x.ui.focusTarget({caseId:'battle:makarevich-1'});const canvas=allPc(x.root).find(n=>n.className==='rd-board-canvas'),transform=canvas.getAttribute('style:transform');
 assert.match(transform,/translate\([1-9][\d.]*px, [\d.]+px\) scale\(/);x.ui.dispose();
});

for(const active of ['track','battle'])test('current work prefers active '+active+' over the other paused job and preserves focus',()=>{
 const track=s=>startTrackStudy(s,{trackVersionId:'weak',heroSnapshot:studySkills(60),nowMinute:13440}),research=s=>startCaseStudy(s,{kind:'battle',battleId:'makarevich-1',heroSnapshot:studySkills(60),nowMinute:13440});
 const first=(active==='track'?research:track)(battle());assert.equal(first.ok,true);
 const second=(active==='track'?track:research)((active==='track'?pauseCaseStudy:pauseStudy)(first.state));assert.equal(second.ok,true);
 const x=setup(second.state),total=active==='track'?45:360,advance=active==='track'?advanceStudy:advanceCaseStudy;
 assert.equal(x.state.rapAnalysis.job.status,active==='track'?'active':'paused');assert.equal(x.state.rapResearch.job.status,active==='battle'?'active':'paused');
 assert.ok(allPc(x.root).some(n=>n.textContent==='Изучаю · 0 / '+total+' игровых минут'));
 const pause=findButton(x.root,'Пауза');pause.focus();x.replaceState(advance(x.state,{gameMinutes:5,nowMinute:13445}).state);x.time(13445);x.ui.update();
 assert.equal(x.d.activeElement,pause);assert.ok(allPc(x.root).some(n=>n.textContent==='Изучаю · 5 / '+total+' игровых минут'));
 findButton(x.root,'К изучаемой карточке').click();assert.equal(nodes(x.root).find(n=>n.getAttribute('aria-pressed')==='true')?.dataset.dossierNode,active==='track'?'track:weak':'battle:makarevich-1');
 findButton(x.root,'Пауза').click();assert.ok(allPc(x.root).some(n=>n.textContent==='На паузе · '+(active==='battle'?5:0)+' / 360 игровых минут'));
 findButton(x.root,'К изучаемой карточке').click();assert.equal(nodes(x.root).find(n=>n.getAttribute('aria-pressed')==='true')?.dataset.dossierNode,'battle:makarevich-1');x.ui.dispose();
});
