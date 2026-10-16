import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/rap-dossier-cases.js';
import {analysisFixture,studySkills} from './helpers/analysis-fixture.js';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {startTrackStudy,advanceStudy} from '../src/rap-analysis.js';
import {startCaseStudy,advanceCaseStudy} from '../src/rap-research.js';
function saved(){return advanceStudy(startTrackStudy(analysisFixture(),{trackVersionId:'weak',heroSnapshot:studySkills(40),nowMinute:100}).state,{gameMinutes:45,nowMinute:145}).state;}
test('legacy reports without exports have their own archive case, including readable missing source reports',()=>{
 assert.equal(typeof api.publicDossierTarget,'function');const s=saved();assert.ok(api.dossierCases(s,{nowMinute:150}).some(c=>c.id==='archive'));
 assert.equal(api.publicDossierCase(s,{caseId:'recordings',nowMinute:150}).nodes.length,0);
 const target=api.publicDossierTarget(s,{reportId:'study:1',nowMinute:150});assert.equal(target.caseId,'archive');assert.equal(target.node.reports[0].trackName,'Первая демка');
 delete s.trackVersions.byId.weak;const missing=api.publicDossierTarget(s,{reportId:'study:1',nowMinute:150});assert.equal(missing.node.action,null);assert.equal(missing.node.reports.length,1);assert.equal(missing.node.status,'unknown');assert.ok(!JSON.stringify(missing).includes('heroSnapshot'));
});
test('public NPC track can be focused outside current opponent; private or future track is rejected',()=>{
 assert.equal(typeof api.publicDossierTarget,'function');const s=topicFixture(),v=analysisFixture().trackVersions.byId.weak;
 s.trackVersions.byId['track:mak-npc-01']={...v,id:'track:mak-npc-01',npc:{characterId:'mak-npc-01',battleId:'makarevich-1',roundId:'selection'}};
 const target=api.publicDossierTarget(s,{trackVersionId:'track:mak-npc-01',nowMinute:13440});assert.equal(target.node.action.request.trackVersionId,'track:mak-npc-01');assert.equal(target.node.kind,'track');
 s.trackVersions.byId.secret={...v,id:'secret',npc:{characterId:'mak-npc-04',battleId:'makarevich-1',roundId:'final'}};assert.equal(api.publicDossierTarget(s,{trackVersionId:'secret',nowMinute:13440}),null);
 assert.equal(api.publicDossierTarget(s,{trackVersionId:'track:mak-npc-01',nowMinute:99}),null);
});
test('public judge focus before folder discovery does not invent learned assignments or opponent role',()=>{
 assert.equal(typeof api.publicDossierTarget,'function');const s=topicFixture(),nowMinute=13440,id=s.roundThemes['makarevich-1:round-2'].authorJudgeId;
 assert.equal(api.publicDossierCase(s,{caseId:'battle:makarevich-1',nowMinute}).nodes.filter(n=>n.kind==='judge').length,0);
 const target=api.publicDossierTarget(s,{characterId:id,nowMinute});assert.equal(target.node.kind,'judge');assert.equal(target.node.action.request.characterId,id);
 assert.equal(api.publicDossierCase(s,{caseId:'battle:makarevich-1',nowMinute}).nodes.filter(n=>n.kind==='judge').length,0);
 assert.equal(api.publicDossierTarget(s,{characterId:'mak-npc-04',nowMinute}),null);
});

test('standalone judge target exposes completed public study reports without pretending they are the judges own recordings',()=>{
 let s=topicFixture();s.software.dossier.installed=true;s.music.needs={satiety:100,energy:100};const v=analysisFixture().trackVersions.byId.weak;s.trackVersions.byId['track:player']={...v,id:'track:player'};
 const started=startCaseStudy(s,{kind:'judge',characterId:'eparhiya',battleId:'makarevich-1',heroSnapshot:studySkills(70),nowMinute:13440});assert.equal(started.ok,true);s=advanceCaseStudy(started.state,{gameMinutes:45,nowMinute:13485}).state;
 const target=api.publicDossierTarget(s,{characterId:'eparhiya',nowMinute:13485});assert.ok(target.node.findingIds.length);assert.equal(target.node.reports[0].trackVersionId,'track:player');assert.equal(target.node.reports[0].subjectId,'player');
});
