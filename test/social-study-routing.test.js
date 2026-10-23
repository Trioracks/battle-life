import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSocial} from '../src/social-view.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {analysisFixture,studySkills} from './helpers/analysis-fixture.js';
import {startTrackStudy,advanceStudy} from '../src/rap-analysis.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
function saved(){let s=analysisFixture();s=advanceStudy(startTrackStudy(s,{trackVersionId:'weak',heroSnapshot:studySkills(10),nowMinute:100}).state,{gameMinutes:45,nowMinute:145}).state;s.social.personalAudioIds=['weak'];return s;}
test('all social routes omit completed analysis cards whether dossier is installed or removed',()=>{
 for(const installed of [true,false])for(const path of ['me','groups','dialog/makarevich-1','profile/eparhiya']){const s=saved();s.software.dossier.installed=installed;const root=pcDocument().createElement('main'),ui=mountSocial(root,{route:resolveSocialRoute('underweb://social/'+path),getState:()=>s,getMetadata:()=>({gameMinutes:150}),onChange:()=>true,navigate:()=>{}});assert.ok(!allPc(root).some(n=>n.getAttribute('aria-label')==='Субъективный отчёт'),path);ui.dispose();}
});
test('installed dossier exposes no Study control in social audio',()=>{
 const s=saved(),targets=[],root=pcDocument().createElement('main'),ui=mountSocial(root,{route:{section:'audio'},getState:()=>s,getMetadata:()=>({gameMinutes:150}),onChange:()=>{throw Error('social must not start study');},navigate:()=>{},onStudyTarget:r=>targets.push(r)});
 assert.equal(findButton(root,'Изучить трек · 45 мин'),undefined);assert.equal(targets.length,0);assert.equal(s.rapAnalysis.job,null);ui.dispose();
});
test('uninstalled dossier adds no Study or download guidance to social audio',()=>{
 const s=saved();s.software.dossier.installed=false;let url='';const root=pcDocument().createElement('main'),ui=mountSocial(root,{route:{section:'audio'},getState:()=>s,getMetadata:()=>({gameMinutes:150}),onChange:()=>true,navigate:u=>{url=u;}});
 assert.equal(allPc(root).some(n=>n.textContent?.includes('Рэп-досье')),false);assert.equal(findButton(root,'Изучить трек · 45 мин'),undefined);assert.equal(url,'');ui.dispose();
});

test('judge research remains in dossier and returning to the public profile exposes no Study button',()=>{
 const s=topicFixture();s.software.dossier.installed=true;const id=s.roundThemes['makarevich-1:round-2'].authorJudgeId,root=pcDocument().createElement('main'),pc=mountVirtualPc(root);pc.showDesktop(s);pc.syncHost({gameMinutes:13440});pc.open('underweb');pc.navigateUnderweb('underweb://social/profile/'+id);
 assert.equal(findButton(root,'Изучить в Рэп-досье'),undefined);pc.open('rap-dossier');pc.dossierView.focusTarget({characterId:id});assert.equal(pc.window,'rap-dossier');assert.ok(allPc(root).some(n=>n.dataset?.dossierNode==='judge:'+id));assert.equal(pc.state.rapResearch.job,null);
 const app=allPc(root).find(n=>n.className==='rap-dossier');findButton(app,'Открыть профиль').click();assert.equal(pc.window,'underweb');assert.equal(findButton(root,'Изучить в Рэп-досье'),undefined);pc.dispose();
});
