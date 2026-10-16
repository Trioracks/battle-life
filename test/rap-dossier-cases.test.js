import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {analysisFixture,studySkills} from './helpers/analysis-fixture.js';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {startCaseStudy,advanceCaseStudy} from '../src/rap-research.js';
import {startTrackStudy,advanceStudy,finishStudyReport,normalizeRapAnalysis} from '../src/rap-analysis.js';
const api=await import('../src/rap-dossier-cases.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const battleId='makarevich-1',caseId='battle:'+battleId;
const fixture=()=>{const s=topicFixture();s.software.dossier.installed=true;s.music.needs={satiety:100,energy:100};s.social.communityPublications={version:1,legacyCutoff:0};s.tournaments.byId[battleId].rounds.selection.submissions={};return s;};
const graph=(s,nowMinute=13440)=>api.publicDossierCase(s,{caseId,nowMinute});
const study=(s,kind='round',roundId='round-2')=>advanceCaseStudy(startCaseStudy(s,{kind,battleId,roundId,heroSnapshot:studySkills(80),nowMinute:13440}).state,{gameMinutes:360,nowMinute:13800}).state;
test('registration creates application-only case and exports create My Recordings',()=>{
 assert.equal(typeof api.dossierCases,'function');const s=analysisFixture();s.battleApplications=[{battleId,nickname:'Я'}];
 assert.ok(api.dossierCases(s,{nowMinute:200}).some(c=>c.id===caseId));const g=graph(s,200);assert.equal(g.nodes.length,1);assert.equal(g.nodes[0].kind,'battle');assert.equal(g.nodes[0].status,'unknown');
 s.audioExports.files=[{id:'file',kind:'track',trackVersionId:'weak',createdAtMinute:150}];
 const recordings=api.publicDossierCase(s,{caseId:'recordings',nowMinute:200});assert.equal(recordings.nodes[0].trackVersionId,'weak');assert.equal(recordings.nodes[0].action.type,'startTrackStudy');
});
test('only immutable submitted own versions link; unexported works stay hidden',()=>{
 assert.equal(typeof api.publicDossierCase,'function');const s=fixture();s.trackVersions=analysisFixture().trackVersions;s.trackVersions.byId.draft={...s.trackVersions.byId.weak,id:'draft'};
 s.battleSubmissions=[{id:'submission',battleId,roundId:'round-2',trackVersionId:'weak',sentAt:13440}];
 const g=graph(s);assert.deepEqual(g.nodes.filter(n=>n.kind==='track').map(n=>n.trackVersionId),['weak']);assert.ok(g.nodes.some(n=>n.kind==='forecast'&&n.status==='unavailable'));
 assert.ok(!JSON.stringify(g).includes('frozen-a'));assert.ok(!JSON.stringify(g).includes('qualities'));
});
test('folders precede discovery; study reveals public assignments and later announcements only in studied folder',()=>{
 assert.equal(typeof api.publicDossierCase,'function');let s=fixture();const future={...s.tournaments.byId[battleId].rounds['round-2'],roundId:'final',opensAt:40000};s.tournaments.byId[battleId].rounds.final=future;
 assert.equal(graph(s).nodes.filter(n=>n.kind==='judge').length,0);assert.deepEqual(graph(s).nodes.filter(n=>n.kind==='round').map(n=>n.roundId),['selection','round-2']);
 const author=s.roundThemes[battleId+':round-2'].authorJudgeId;s=study(s);const early=graph(s,13800),judges=early.nodes.filter(n=>n.kind==='judge');assert.ok(judges.some(n=>n.characterId===author));assert.ok(judges.every(n=>n.status==='unknown'));assert.ok(!JSON.stringify(early).includes('final'));
 const later=graph(s,23000);assert.ok(later.nodes.filter(n=>n.kind==='judge').length>judges.length);assert.equal(later.nodes.filter(n=>n.kind==='judge').length,3);
 assert.ok(later.edges.filter(e=>e.kind==='judge').every(e=>e.from==='round:'+battleId+':round-2'));
});
test('known opponent has a profile; unpublished works do not appear',()=>{
 assert.equal(typeof api.publicDossierCase,'function');const s=fixture(),r=s.tournaments.byId[battleId].rounds['round-2'];r.pairs=[{participantIds:['player','mak-npc-01']}];r.submissions={'mak-npc-01':'hidden-work'};
 const g=graph(s);assert.deepEqual(g.nodes.filter(n=>n.kind==='opponent').map(n=>n.characterId),['mak-npc-01']);assert.ok(g.nodes.find(n=>n.kind==='opponent').profileUrl);assert.ok(!JSON.stringify(g).includes('hidden-work'));
});
test('missing versions, dangling reports and unknown cases stay explicit without mutation',()=>{
 assert.equal(typeof api.publicDossierCase,'function');let s=fixture();s.trackVersions=analysisFixture().trackVersions;s.battleSubmissions=[{id:'submission',battleId,roundId:'round-2',trackVersionId:'missing',sentAt:13440}];
 s=study(s);const f=Object.values(s.rapResearch.findings)[0];f.reportIds=['lost-report'];const before=JSON.stringify(s);
 const g=graph(s,13800);assert.equal(g.nodes.find(n=>n.trackVersionId==='missing').status,'unknown');assert.equal(g.nodes.find(n=>n.trackVersionId==='missing').action,null);assert.ok(g.nodes.find(n=>n.kind==='round'&&n.roundId==='round-2').missingReportIds.includes('lost-report'));assert.equal(JSON.stringify(s),before);
 assert.equal(api.publicDossierCase(s,{caseId:'old-case',nowMinute:13800}).status,'unknown');
});
test('forecast uses attached report version and public pair rules; saved reports stay identical',()=>{
 assert.equal(typeof api.publicDossierCase,'function');let s=fixture();s.trackVersions=analysisFixture().trackVersions;
 s=advanceStudy(startTrackStudy(s,{trackVersionId:'weak',heroSnapshot:studySkills(80),nowMinute:13440}).state,{gameMinutes:45,nowMinute:13485}).state;
 const before=JSON.stringify(s.rapAnalysis.reports);s.battleSubmissions=[{id:'s',battleId,roundId:'round-2',trackVersionId:'weak',sentAt:13440}];const f=graph(s,13800).nodes.find(n=>n.kind==='forecast');assert.equal(f.forecast.range,null);assert.equal(f.forecast.comparison.status,'unknown');assert.equal(JSON.stringify(s.rapAnalysis.reports),before);
});
test('20-track multi-round graph reuses frozen projection across frames without archive serialization',()=>{
 assert.equal(typeof api.publicDossierCase,'function');let s=fixture();const v=analysisFixture().trackVersions.byId.weak;
 for(let i=0;i<20;i++){const id='v'+i;s.trackVersions.byId[id]={...v,id};s.audioExports.files.push({id:'file'+i,kind:'track',trackVersionId:id,createdAtMinute:100});s.rapAnalysis.reports['study:'+i]=finishStudyReport(s.trackVersions.byId[id],{id:'study:'+i,subjectId:'player',trackVersionId:id,trackName:v.name,heroSnapshot:studySkills(80),reviewIds:[],seed:i,diversity:i},200);}
 s=study(s);let scans=0;s.rapAnalysis.reports=new Proxy(s.rapAnalysis.reports,{ownKeys(target){scans++;return Reflect.ownKeys(target);}});const opts={caseId:'recordings',nowMinute:13800},first=api.publicDossierCase(s,opts),battle=graph(s,13800);assert.equal(first.nodes.length,20);assert.ok(Object.isFrozen(first));assert.equal(first.nodes[0].reports.length,1);scans=0;
 const old=JSON.stringify;let serializations=0;JSON.stringify=(...args)=>{serializations++;return old(...args);};const started=performance.now();
 try{for(let i=0;i<2000;i++){const frame={...s,music:{...s.music,needs:{energy:i}}};assert.equal(api.publicDossierCase(frame,opts),first);assert.equal(graph(frame,13800),battle);}}finally{JSON.stringify=old;}
 assert.equal(serializations,0);assert.equal(scans,0);console.log('projection 20 tracks+reports / multi-round / 2000 warm frames:',(performance.now()-started).toFixed(2),'ms; serializations:',serializations,'report scans:',scans);
 const next={...s,audioExports:{...s.audioExports,files:[...s.audioExports.files,{id:'missing',kind:'track',trackVersionId:'lost',createdAtMinute:13800}]}};assert.notEqual(api.publicDossierCase(next,opts),first);
});
test('fractional cutoff queries cannot reuse a later graph for an earlier time',()=>{
 let s=study(fixture());const author=s.roundThemes[battleId+':round-2'].authorJudgeId;
 s.socialReactions.plans={'announce:judge:klim-propavshiy':{version:1,postId:'announce:judge:klim-propavshiy',context:'judge-announcement',startAt:13800.5}};
 const later=graph(s,13800.6),early=graph(s,13800.4);assert.ok(later.nodes.some(n=>n.kind==='judge'&&n.characterId==='klim-propavshiy'));assert.notEqual(author,'klim-propavshiy');assert.ok(!early.nodes.some(n=>n.kind==='judge'&&n.characterId==='klim-propavshiy'));assert.notEqual(early,later);
});
test('battle study discovers only rounds that existed at its cutoff, not future folders',()=>{
 let s=study(fixture(),'battle');s.tournaments={...s.tournaments,byId:{...s.tournaments.byId,[battleId]:{...s.tournaments.byId[battleId],rounds:{...s.tournaments.byId[battleId].rounds,'round-3':{...s.tournaments.byId[battleId].rounds['round-2'],roundId:'round-3',opensAt:14000}}}}};
 const g=graph(s,15000);assert.ok(g.nodes.some(n=>n.kind==='round'&&n.roundId==='round-3'));assert.ok(!g.edges.some(e=>e.kind==='judge'&&e.from==='round:'+battleId+':round-3'));
});
test('old own submission without a surviving round remains navigable',()=>{
 const s=analysisFixture();s.battleApplications=[{battleId,nickname:'Я'}];s.battleSubmissions=[{id:'old',battleId,roundId:'selection',trackVersionId:'weak',sentAt:150}];
 const g=graph(s,200);assert.ok(g.nodes.some(n=>n.kind==='track'&&n.trackVersionId==='weak'));
});
test('report of wrong author cannot forecast attached own version; private judge changes cannot change graph',()=>{
 let s=fixture();s.trackVersions=analysisFixture().trackVersions;s=advanceStudy(startTrackStudy(s,{trackVersionId:'weak',heroSnapshot:studySkills(80),nowMinute:13440}).state,{gameMinutes:45,nowMinute:13485}).state;
 s.battleSubmissions=[{id:'s',battleId,roundId:'selection',trackVersionId:'weak',sentAt:13440}];s.rapAnalysis.reports['study:1'].subjectId='mak-npc-01';
 const g=graph(s,13800);assert.equal(g.nodes.find(n=>n.kind==='forecast').forecast.status,'unavailable');
 const changed={...s,judging:{results:{secret:{raw:10000,weights:{text:100},trackVersionId:'weak'}}}};assert.deepEqual(graph(changed,13800),g);
});
test('corrupt finding references remain explicit after save recovery without discovering judges',()=>{
 const s=fixture();s.rapResearch.recovery=[{type:'finding',id:'lost',recoveryData:{id:'lost',kind:'round',subject:{kind:'round',battleId,roundId:'round-2'},createdAt:13440,reportIds:['missing']}}];
 const g=graph(s,13800),round=g.nodes.find(n=>n.kind==='round'&&n.roundId==='round-2');assert.ok(round.missingReportIds.includes('missing'));assert.equal(round.status,'unknown');assert.ok(!g.nodes.some(n=>n.kind==='judge'));
});
test('quarantined report is explicit on its recording and cannot supply forecast',()=>{
 const s=analysisFixture();s.audioExports.files=[{id:'file',kind:'track',trackVersionId:'weak',createdAtMinute:150}];s.rapAnalysis.recovery=[{type:'report',id:'damaged',recoveryData:{id:'damaged',trackVersionId:'weak',subjectId:'player',createdAt:155}}];
 const n=api.publicDossierCase(s,{caseId:'recordings',nowMinute:200}).nodes[0];assert.equal(n.status,'unknown');assert.deepEqual(n.missingReportIds,['damaged']);assert.equal(n.reports.length,0);assert.ok(n.action);
});
test('round graph honors canonical theme-author evidence even outside raw roster',()=>{
 let s=fixture();s.roundThemes[battleId+':round-2'].authorJudgeId='audience';s=study(s);
 const g=graph(s,13800);assert.ok(g.nodes.some(n=>n.kind==='judge'&&n.characterId==='audience'));assert.ok(!g.nodes.some(n=>n.kind==='judge'&&n.characterId==='klim-propavshiy'));
});
test('malformed attachment references are unknown and never freeze or expose original recovery objects',()=>{
 const s=analysisFixture(),bad={private:'do-not-copy'};s.battleSubmissions=[null];s.audioExports.files=[{id:'file',kind:'track',trackVersionId:bad,createdAtMinute:150}];
 const g=api.publicDossierCase(s,{caseId:'recordings',nowMinute:200});assert.equal(g.nodes[0].trackVersionId,null);assert.equal(Object.isFrozen(bad),false);assert.ok(!JSON.stringify(g).includes('do-not-copy'));
 const battle=fixture();battle.battleSubmissions=[{id:'bad',battleId,roundId:'selection',trackVersionId:bad,sentAt:100}];const projected=graph(battle);assert.equal(projected.nodes.find(n=>n.kind==='forecast').trackVersionId,null);assert.equal(Object.isFrozen(bad),false);
});
test('unsupported battle has unknown forecast scale rather than invented selection total',()=>{
 const s=fixture(),other='concrete-echo',v=analysisFixture().trackVersions.byId.weak;s.trackVersions.byId.weak=v;s.battleApplications=[{battleId:other,nickname:'Я'}];
 s.tournaments.byId[other]={...s.tournaments.byId[battleId],battleId:other};s.battleSubmissions=[{id:'s',battleId:other,roundId:'selection',trackVersionId:'weak',sentAt:100}];
 s.rapAnalysis.reports.r=finishStudyReport(v,{id:'r',subjectId:'player',trackVersionId:'weak',trackName:v.name,heroSnapshot:studySkills(80),reviewIds:[],seed:1,diversity:1},200);
 const g=api.publicDossierCase(s,{caseId:'battle:'+other,nowMinute:13800}),f=g.nodes.find(n=>n.kind==='forecast');assert.equal(f.forecast.status,'unavailable');assert.equal(f.forecast.range,null);
});
test('changing-cutoff instrumentation measures 20-track and report graph rebuilds across public rounds',()=>{
 let s=fixture();const v=analysisFixture().trackVersions.byId.weak;
 for(let i=0;i<20;i++){const id='timed:'+i;s.trackVersions.byId[id]={...v,id};s.audioExports.files.push({id:'file:'+i,kind:'track',trackVersionId:id,createdAtMinute:100});s.rapAnalysis.reports[id]=finishStudyReport(s.trackVersions.byId[id],{id,subjectId:'player',trackVersionId:id,trackName:v.name,heroSnapshot:studySkills(80),reviewIds:[],seed:i,diversity:i},200);}
 s.battleSubmissions=[{id:'timed-submit',battleId,roundId:'round-2',trackVersionId:'timed:0',sentAt:13440}];s.tournaments.byId[battleId].rounds['round-2'].pairs=[{participantIds:['player','mak-npc-01']}];s=study(s);const durations=[];
 for(let i=0;i<100;i++){const nowMinute=14000+i/10,start=performance.now(),recordings=api.publicDossierCase(s,{caseId:'recordings',nowMinute}),battle=graph(s,nowMinute);durations.push(performance.now()-start);assert.equal(recordings.nodes.length,20);assert.equal(battle.nodes.filter(n=>n.kind==='round').length,2);}
 durations.sort((a,b)=>a-b);console.log('changing-cutoff 20 tracks+reports / two cases / 100 rebuilds: p95',durations[94].toFixed(2),'ms; max',durations[99].toFixed(2),'ms');
});
test('battle discovery links each round only to reports from that public round',()=>{
 let s=fixture();s.trackVersions=analysisFixture().trackVersions;s.tournaments.byId[battleId].rounds.selection.submissions={player:'weak'};s=study(s,'battle');
 const g=graph(s,13800),prior=g.nodes.find(n=>n.kind==='round'&&n.roundId==='selection'),current=g.nodes.find(n=>n.kind==='round'&&n.roundId==='round-2');
 assert.equal(prior.reports.length,1);assert.equal(current.status,'studied');assert.deepEqual(current.reportIds,[]);assert.deepEqual(current.missingReportIds,[]);assert.equal(current.findingIds.length,1);
});
test('normalized report with malformed supersedes stays unknown without disclosing or freezing saved metadata',()=>{
 const s=fixture(),v=analysisFixture().trackVersions.byId.weak;s.trackVersions.byId.weak=v;s.battleSubmissions=[{id:'submitted',battleId,roundId:'selection',trackVersionId:'weak',sentAt:100}];
 const r=finishStudyReport(v,{id:'broken',subjectId:'player',trackVersionId:'weak',trackName:v.name,heroSnapshot:studySkills(80),reviewIds:[],seed:1,diversity:1},200);r.supersedes={rawPrivate:'must-not-disclose',nested:{weight:99}};
 s.rapAnalysis=normalizeRapAnalysis({reports:{broken:r},sourceIds:['weak']});assert.equal(s.rapAnalysis.reports.broken,undefined);const saved=s.rapAnalysis.recovery[0].recoveryData,original=JSON.stringify(saved),metadata=saved.supersedes;assert.deepEqual(saved,r);assert.equal(Object.isFrozen(metadata),false);
 const g=graph(s,13800),track=g.nodes.find(n=>n.kind==='track');assert.ok(!JSON.stringify(g).includes('must-not-disclose'));assert.equal(Object.isFrozen(metadata),false);assert.equal(Object.isFrozen(metadata.nested),false);assert.equal(saved.supersedes,metadata);assert.equal(JSON.stringify(saved),original);assert.equal(track.status,'unknown');assert.deepEqual(track.missingReportIds,['broken']);assert.equal(track.reports.length,0);assert.equal(g.nodes.find(n=>n.kind==='forecast').forecast.status,'unavailable');
});
