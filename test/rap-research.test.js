import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisFixture,studySkills} from './helpers/analysis-fixture.js';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {opponentFixture} from './helpers/social-profile-fixture.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceCreativeWork,creativeWorkDescriptor} from '../src/home-creative-work.js';
import {startTrackStudy} from '../src/rap-analysis.js';
import {uninstallSoftware} from '../src/pc-software.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js';
import {createBeatWorkAudio} from '../src/beat-work-audio.js';
import {judgeStudyFixture} from './helpers/judge-study-fixture.js';
import {creativeFixture} from './helpers/creative-fixtures.js';
import {startCreativeChain,pauseCreativeChain} from '../src/creative-workflow.js';
import {createLyric,startLyricWork,advanceLyricWork} from '../src/lyric-production.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';
import {createBeatWorkPanel} from '../src/beat-work-view.js';
const api=await import('../src/rap-research.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const sources=await import('../src/rap-research-sources.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const installed=s=>({...s,software:{...s.software,dossier:{...s.software.dossier,installed:true}},music:{...s.music,needs:{satiety:100,energy:100}}});
const request={kind:'round',battleId:'makarevich-1',roundId:'round-2',heroSnapshot:studySkills(80),nowMinute:13440};
const begin=s=>api.startCaseStudy(s,request);

test('research API validates installed-only start and resume; uninstall preserves job and findings',()=>{
 assert.equal(typeof api.startCaseStudy,'function');let s=topicFixture();assert.equal(begin(s).ok,false);
 s=begin(installed(s)).state;s=api.advanceCaseStudy(s,{gameMinutes:20,nowMinute:13460}).state;
 const saved=s.rapResearch;s=uninstallSoftware(s,'dossier').state;assert.deepEqual(s.rapResearch,saved);
 assert.equal(begin(s).ok,false);assert.equal(api.advanceCaseStudy(s,{gameMinutes:20,nowMinute:13480}).minutes,0);
 s=begin(installed(api.pauseCaseStudy(s))).state;assert.equal(s.rapResearch.job.elapsed,20);
});
test('six-hour case uses fixed rate, survives pause/reload, freezes skills, and completes unknown without audio',()=>{
 assert.equal(typeof api.startCaseStudy,'function');let s=begin(installed(topicFixture())).state;
 const audio=createBeatWorkAudio({playProject(){assert.fail('research must not prepare audio');}});
 let d=creativeWorkDescriptor(s);audio.sync({phase:'working',beat:d.project,job:d.job});
 let r=advanceCreativeWork(s,8,{day:10,minutes:480});assert.equal(r.minutes,45);assert.equal(r.finished,false);
 s=createVirtualPcState(JSON.parse(JSON.stringify(api.pauseCaseStudy(r.state))));assert.equal(creativeWorkDescriptor(s).job,null);
 s=api.startCaseStudy(s,{...request,heroSnapshot:studySkills(1),nowMinute:14000}).state;
 assert.equal(s.rapResearch.job.heroSnapshot.writing,80);
 r=advanceCreativeWork(s,56,{day:10,minutes:1040});assert.equal(r.minutes,315);assert.equal(r.finished,true);
 const f=Object.values(r.state.rapResearch.findings)[0];assert.equal(f.evidenceStatus,'unknown');assert.deepEqual(f.reportIds,[]);assert.equal(f.cutoff,13440);
 const again=api.startCaseStudy(r.state,{...request,nowMinute:13440});assert.equal(again.findingId,f.id);assert.equal(again.state.rapResearch.job,null);
 audio.dispose();
});
test('needs pause exact remaining time; active case and creative work exclude each other',()=>{
 assert.equal(typeof api.startCaseStudy,'function');let s=begin(installed(topicFixture())).state;s.music.needs.satiety=21.2;
 const r=advanceCreativeWork(s,8);assert.ok(Math.abs(r.minutes-10)<1e-7);assert.equal(r.blocked,true);assert.equal(r.state.rapResearch.job.status,'paused');
 s=createBeat(s,{id:'new',name:'Новый'}).state;assert.equal(startBeatStage(s,'new').ok,false);
 assert.equal(startTrackStudy({...s,...analysisFixture(),rapResearch:s.rapResearch},{trackVersionId:'weak',nowMinute:100}).ok,false);
 s=api.pauseCaseStudy(s);s=startBeatStage({...s,music:{...s.music,needs:{satiety:100,energy:100}}},'new').state;
 assert.equal(begin(s).ok,false);
});
test('canonical round assignments exclude future roster and bulk snapshots exclude later reviews',()=>{
 assert.equal(typeof sources.caseStudySources,'function');const s=installed(topicFixture()),t=s.tournaments.byId['makarevich-1'];
 const author=s.roundThemes['makarevich-1:round-2'].authorJudgeId;
 const early=sources.caseStudySources(s,request);assert.deepEqual(early.judgeIds,[author]);assert.deepEqual(early.trackVersionIds,[]);
 t.rounds.final={...t.rounds['round-2'],roundId:'final',opensAt:30000,closesAt:40000};
 assert.deepEqual(sources.caseStudySources(s,{...request,roundId:'final'}).sourceIds,[]);
 s.trackVersions.byId.weak=analysisFixture().trackVersions.byId.weak;t.rounds.selection.submissions.player='weak';
 const initial=api.startCaseStudy(s,{...request,kind:'battle',nowMinute:13440}).state;
 const ids=[...initial.rapResearch.job.reviewIds];
 initial.judging.results.later={id:'later',trackVersionId:'weak',judgeId:author,comment:'Позже'};
 initial.socialRuntime.events.push({id:'p-later',type:'judge-review',resultId:'later',dueAt:13441});
 assert.deepEqual(initial.rapResearch.job.reviewIds,ids);
 const done=api.advanceCaseStudy(initial,{gameMinutes:360,nowMinute:13800});assert.ok(!Object.values(done.state.rapResearch.findings)[0].reviewIds.includes('later'));
 assert.ok(Object.values(done.state.rapAnalysis.reports).some(r=>r.trackVersionId==='weak'));assert.ok(Object.values(done.state.rapAnalysis.reports).every(r=>!r.reviewIds.includes('later')));
});
test('opponent uses published prior works, creates bounded immutable reports once, and missing sources pause',()=>{
 assert.equal(typeof api.startCaseStudy,'function');let s=installed(opponentFixture());const v=analysisFixture().trackVersions.byId.weak;
 s.trackVersions.byId.old={...v,id:'old',npc:{battleId:'makarevich-1',characterId:'mak-npc-01'},createdAtMinute:100};
 s.trackVersions.byId.future={...v,id:'future',npc:{battleId:'makarevich-1',characterId:'mak-npc-01'},createdAtMinute:20000};
 s.battleHistory.entries.push(...['old','future'].map((id,i)=>({id:'h-'+id,battleId:'makarevich-1',roundId:'selection',participantId:'mak-npc-01',status:'submitted',trackVersionId:id,occurredAt:i?20000:100})));
 const req={...request,kind:'opponent',characterId:'mak-npc-01'};s=api.startCaseStudy(s,req).state;
 assert.ok(s.rapResearch.job.trackVersionIds.includes('old'));assert.ok(!s.rapResearch.job.trackVersionIds.includes('future'));assert.equal(s.rapResearch.job.total,45);
 const broken=structuredClone(s);delete broken.trackVersions.byId.old;
 const paused=api.advanceCaseStudy(broken,{gameMinutes:45,nowMinute:13485});assert.equal(paused.blocked,true);assert.equal(paused.minutes,0);assert.equal(paused.state.rapResearch.job.status,'paused');
 const done=api.advanceCaseStudy(s,{gameMinutes:45,nowMinute:13485});assert.equal(done.finished,true);
 for(const report of Object.values(done.state.rapAnalysis.reports))for(const o of Object.values(report.observations)){assert.ok(Number.isFinite(o.confidence));assert.ok(o.band===null||o.band>=0&&o.band<=7);}
 assert.ok(Object.values(done.state.rapAnalysis.reports).some(r=>r.trackVersionId==='old'));
 const original=structuredClone(done.state.rapAnalysis.reports),repeat=api.startCaseStudy(done.state,req);assert.ok(repeat.findingId);assert.deepEqual(repeat.state.rapAnalysis.reports,original);
 assert.equal(api.advanceCaseStudy(repeat.state,{gameMinutes:45,nowMinute:13530}).practiceGained,0);
});
test('invalid jobs and findings are quarantined once',()=>{
 assert.equal(typeof api.normalizeRapResearch,'function');const raw={job:{kind:'battle',elapsed:Infinity},findings:{bad:{id:'bad'}},nextSequence:0};
 const n=api.normalizeRapResearch(raw);assert.equal(n.job,null);assert.deepEqual(n.findings,{});assert.equal(n.recovery.length,2);assert.deepEqual(api.normalizeRapResearch(n),n);
});
test('completed case observes tracks but only separate judge research learns taste from real published reviews',()=>{
 let s=installed(topicFixture()),known=judgeStudyFixture();s.trackVersions=known.trackVersions;s.judging=known.judging;s.rapAnalysis=known.rapAnalysis;
 const round=s.tournaments.byId['makarevich-1'].rounds.selection;round.submissions={player:'weak'};round.judgeBatches={eparhiya:{publishedAt:150,resultIds:['r']}};
 const original=structuredClone(s.rapAnalysis.reports);
 s=api.startCaseStudy(s,{...request,kind:'battle'}).state;const completed=api.advanceCaseStudy(s,{gameMinutes:360,nowMinute:13800});s=completed.state;
 assert.equal(completed.finished,true);assert.equal(s.judgeDossier.evidence.length,0);assert.equal(s.rapAnalysis.reports['study:1'].createdAt,145);
 for(const [id,report]of Object.entries(original))assert.deepEqual(s.rapAnalysis.reports[id],report);
 const started=api.startCaseStudy(s,{...request,kind:'judge',characterId:'eparhiya',nowMinute:13800});assert.equal(started.ok,true);assert.equal(started.state.rapResearch.job.total,45);
 const done=api.advanceCaseStudy(started.state,{gameMinutes:45,nowMinute:13845});assert.equal(done.finished,true);assert.equal(done.state.judgeDossier.evidence.length,1);
 assert.equal(Object.values(done.state.rapResearch.findings).at(-1).evidenceStatus,'observed');
 assert.deepEqual(createVirtualPcState(done.state).rapResearch,done.state.rapResearch);
 const repeat=api.startCaseStudy(done.state,{...request,kind:'judge',characterId:'eparhiya',nowMinute:14000});assert.ok(repeat.findingId);assert.equal(repeat.state.rapResearch.job,null);
});
test('judge with announced identity but no reviews completes explicitly unknown and future subject refuses',()=>{
 let s=installed(topicFixture()),characterId=s.roundThemes['makarevich-1:round-2'].authorJudgeId;
 const started=api.startCaseStudy(s,{...request,kind:'judge',characterId});assert.equal(started.ok,true);
 const done=api.advanceCaseStudy(started.state,{gameMinutes:45,nowMinute:13485});assert.equal(done.finished,true);assert.equal(Object.values(done.state.rapResearch.findings)[0].evidenceStatus,'unknown');assert.equal(done.state.judgeDossier.evidence.length,0);
 assert.equal(api.startCaseStudy(s,{...request,roundId:'final'}).ok,false);
});
test('all paused creative chains refuse resume during research and research refuses active lyric work',()=>{
 for(const kind of ['beat','lyrics']){const f=creativeFixture(kind);let s=startCreativeChain(f.state,{kind,projectId:f.projectId}).state;s=pauseCreativeChain(s);
  s={...s,software:installed(s).software,tournaments:topicFixture().tournaments};s=begin(s).state;
  assert.equal(startCreativeChain(s,{kind,projectId:f.projectId}).ok,false);
  if(kind==='lyrics'){assert.equal(startLyricWork(s,{projectId:f.projectId}).ok,false);s=api.pauseCaseStudy(s);s=startLyricWork(s,{projectId:f.projectId}).state;assert.equal(begin(s).ok,false);}
 }
});
test('vocal start and resume cannot overlap research and active vocal work blocks case resume',()=>{
 let s=createBeat(installed(topicFixture()),{id:'b',name:'Бит'}).state;s=createLyric(s,{id:'l',name:'Текст'}).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceBeatWork(startBeatStage(s,'b').state,1000).state;s.music.needs={satiety:100,energy:100};s=advanceLyricWork(startLyricWork(s,{projectId:'l'}).state,1000).state;}
 s.music.needs={satiety:100,energy:100};const req={beatId:'b',textId:'l',kind:'draft'};
 let active=begin(s).state;assert.equal(startVocalWork(active,req).ok,false);
 active=api.pauseCaseStudy(active);active=startVocalWork(active,req).state;assert.ok(active.recording.job);assert.equal(begin(active).ok,false);
 const conflict={...active,rapResearch:{...active.rapResearch,job:{...active.rapResearch.job,status:'active'}}};assert.equal(startVocalWork(conflict,req).ok,false);
 assert.equal(advanceVocalWork(conflict,10).minutes,0);assert.equal(api.advanceCaseStudy(conflict,{gameMinutes:10,nowMinute:13450}).minutes,0);
 const recovered=createVirtualPcState(conflict);assert.equal(recovered.rapResearch.job.status,'paused');assert.equal(recovered.rapResearch.job.elapsed,0);
});
test('conflicting raw beat and lyric jobs cannot advance alongside an active study',()=>{
 const research=begin(installed(topicFixture())).state.rapResearch;
 for(const kind of ['beat','lyrics']){const f=creativeFixture(kind),s=startCreativeChain(f.state,{kind,projectId:f.projectId}).state;
  const conflict={...s,rapResearch:research};assert.equal((kind==='beat'?advanceBeatWork:advanceLyricWork)(conflict,10).minutes,0);
 }
});
test('reload pauses a case with a missing saved review without consuming needs or losing sources',()=>{
 const s=installed(topicFixture()),known=judgeStudyFixture();s.trackVersions=known.trackVersions;s.judging=known.judging;
 const round=s.tournaments.byId['makarevich-1'].rounds.selection;round.submissions.player='weak';round.judgeBatches={eparhiya:{publishedAt:150,resultIds:['r']}};
 const started=api.startCaseStudy(s,{...request,kind:'judge',characterId:'eparhiya'}).state;delete started.judging.results.r;
 const loaded=createVirtualPcState(started);assert.equal(loaded.rapResearch.job.status,'paused');assert.deepEqual(loaded.rapResearch.job.reviewIds,['r']);assert.equal(loaded.rapResearch.job.elapsed,0);
});
test('ordinary progress preserves report/finding archive references and damaged jobs cannot overwrite completion',()=>{
 const s=begin(installed(topicFixture())).state,r=api.advanceCaseStudy(s,{gameMinutes:1,nowMinute:13441});
 assert.equal(r.state.rapResearch.findings,s.rapResearch.findings);assert.equal(r.state.rapAnalysis,s.rapAnalysis);
 const complete=api.advanceCaseStudy(s,{gameMinutes:360,nowMinute:13800}).state;
 complete.rapResearch.nextSequence=1;const normalized=api.normalizeRapResearch(complete.rapResearch);assert.equal(normalized.nextSequence,2);
 const malformed={...s.rapResearch,job:{...s.rapResearch.job,reviewIds:['hidden-review']}};
 const quarantined=api.advanceCaseStudy({...s,rapResearch:malformed},{gameMinutes:360,nowMinute:13800});assert.equal(quarantined.finished,false);assert.equal(quarantined.state.rapResearch.job,null);assert.equal(quarantined.state.rapResearch.recovery.length,1);
});
test('closing dossier or leaving/shutting down PC pauses research; HUD displays actual duration',()=>{
 for(const action of ['close','leave','shutdown']){const d=pcDocument(),root=d.createElement('main'),pc=mountVirtualPc(root,{onPersist:()=>true});
  pc.showDesktop({...begin(installed(topicFixture())).state,power:'on'});
  if(action==='close')pc.closeWindow('rap-dossier');else if(action==='leave')pc.requestLeave();else pc.requestShutdown();
  assert.equal(pc.state.rapResearch.job.status,'paused');pc.dispose();
 }
 const panel=createBeatWorkPanel(pcDocument());panel.update({beat:{kind:'study',name:'Изучение раунда'},job:{total:360,elapsed:45}});
 assert.match(allPc(panel.element).find(n=>n.dataset.workRole==='stage').textContent,/360/);panel.dispose();
});
