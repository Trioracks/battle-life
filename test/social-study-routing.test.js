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
test('installed Study routes exact frozen track target without starting work in social',()=>{
 const s=saved(),targets=[],root=pcDocument().createElement('main'),ui=mountSocial(root,{route:{section:'audio'},getState:()=>s,getMetadata:()=>({gameMinutes:150}),onChange:()=>{throw Error('social must not start study');},navigate:()=>{},onStudyTarget:r=>targets.push(r)});
 findButton(root,'Изучить трек · 45 мин').click();assert.equal(targets.length,1);assert.equal(targets[0].trackVersionId,'weak');assert.equal(s.rapAnalysis.job,null);ui.dispose();
});
test('uninstalled Study explains destination and routes to download',()=>{
 const s=saved();s.software.dossier.installed=false;let url='';const root=pcDocument().createElement('main'),ui=mountSocial(root,{route:{section:'audio'},getState:()=>s,getMetadata:()=>({gameMinutes:150}),onChange:()=>true,navigate:u=>{url=u;}});
 assert.ok(allPc(root).some(n=>n.textContent?.includes('Рэп-досье')));findButton(root,'Изучить трек · 45 мин').click();assert.equal(url,'underweb://dump/dossier');ui.dispose();
});

test('public judge profile Study opens focused dossier before folder discovery and returns to profile',()=>{
 const s=topicFixture();s.software.dossier.installed=true;const id=s.roundThemes['makarevich-1:round-2'].authorJudgeId,root=pcDocument().createElement('main'),pc=mountVirtualPc(root);pc.showDesktop(s);pc.syncHost({gameMinutes:13440});pc.open('underweb');pc.navigateUnderweb('underweb://social/profile/'+id);
 findButton(root,'Изучить в Рэп-досье').click();assert.equal(pc.window,'rap-dossier');assert.ok(allPc(root).some(n=>n.dataset?.dossierNode==='judge:'+id));assert.equal(pc.state.rapResearch.job,null);
 const app=allPc(root).find(n=>n.className==='rap-dossier');findButton(app,'Открыть профиль').click();assert.equal(pc.window,'underweb');assert.ok(findButton(root,'Изучить в Рэп-досье'));pc.dispose();
});
