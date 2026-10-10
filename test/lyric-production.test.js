import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import * as lyrics from '../src/lyric-production.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js';
const fresh=()=>createVirtualPcState({power:'on',music:{needs:{satiety:100,energy:100}}});
const create=(opts={},skills={writing:10})=>lyrics.createLyric(fresh(),{id:'words-1',name:'Тест',gameDay:1,...opts},skills,()=>.37).state;
function finish(s,skills={writing:10},kind='stage',extra={}){const r=lyrics.startLyricWork(s,{projectId:s.projects[0].id,kind,...extra},skills,()=>.5);assert.equal(r.ok,true,r.reason);return lyrics.advanceLyricWork(r.state,1000).state;}

test('battle text takes theme and metadata without registering the hero',()=>{
 const s=create({battleId:'concrete-echo'}),p=s.projects[0];
 assert.equal(p.name,'Голос спального района');assert.equal(p.createdDate,'01.09.2012');assert.equal(p.round,'Отбор');assert.equal(p.opponent,'Не назначен');assert.equal(s.battleApplications.length,0);assert.deepEqual(p.sections,[]);
 assert.equal(lyrics.createLyric(s,{id:'bad',battleId:'nonexistent'},{writing:10}).ok,false);
});
test('three lyric stages persist stable glyphs and award only a third of a writing level each',()=>{
 let s=create();for(let i=0;i<3;i++)s=finish(s);
 const p=s.projects[0];assert.equal(p.status,'ready');assert.equal(p.stages.length,3);assert.ok(p.sections.length>0);
 assert.ok(p.sections.flatMap(s=>s.lines).some(line=>line.words.some(w=>w.error)));
 assert.equal(s.writing.practice,1);const copy=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(copy.projects[0],p);assert.deepEqual(lyrics.advanceLyricWork(copy,1000).state.projects[0],p);assert.equal(lyrics.advanceLyricWork(copy,1000).state.writing.practice,1);
});
test('partial lyric work stops for food and resumes once without duplicating practice',()=>{
 let s=create();s.music.needs.satiety=21;s=lyrics.startLyricWork(s,{projectId:'words-1',kind:'stage'},{writing:10},()=>.5).state;
 const r=lyrics.advanceLyricWork(s,1000);assert.equal(r.blocked,true);assert.equal(r.finished,false);assert.ok(r.state.writing.practice>0);assert.ok(r.state.writing.practice<1/3);
 s=createVirtualPcState(JSON.parse(JSON.stringify(r.state)));const elapsed=s.writing.job.elapsed;s.music.needs.satiety=100;
 s=lyrics.startLyricWork(s,{projectId:'words-1',kind:'stage'},{writing:99}).state;assert.equal(s.writing.job.elapsed,elapsed);assert.equal(s.writing.job.skill,10);
 s=lyrics.advanceLyricWork(s,1000).state;assert.ok(Math.abs(s.writing.practice-1/3)<1e-9);assert.equal(s.projects[0].stages.length,1);
});
test('strong writing structures lines with fewer errors and honors eight-line and no-chorus briefs',()=>{
 let weak=create(),strong=create({}, {writing:90});for(let i=0;i<3;i++){weak=finish(weak);strong=finish(strong,{writing:90});}
 const errors=s=>s.projects[0].sections.flatMap(p=>p.lines).flatMap(l=>l.words).filter(w=>w.error).length;
 assert.ok(errors(strong)<errors(weak));assert.ok(strong.projects[0].sections.length>weak.projects[0].sections.length);
 let eight=create({battleId:'yard-cipher'},{writing:90});for(let i=0;i<3;i++)eight=finish(eight,{writing:90});assert.equal(eight.projects[0].sections.flatMap(s=>s.lines).length,8);
 let noChorus=create({battleId:'open-mic-17'},{writing:90});for(let i=0;i<3;i++)noChorus=finish(noChorus,{writing:90});assert.ok(noChorus.projects[0].sections.every(s=>s.type!=='chorus'));
 assert.equal(lyrics.startLyricWork(noChorus,{projectId:'words-1',kind:'chorus'},{writing:90}).ok,false);
});
test('additions are work, create a new version, and cannot bypass battle limits',()=>{
 let s=create();for(let i=0;i<3;i++)s=finish(s);s.music.needs={satiety:100,energy:100};
 const before=s.projects[0],started=lyrics.startLyricWork(s,{projectId:'words-1',kind:'diss'},{writing:10});assert.equal(started.ok,true);assert.deepEqual(started.state.projects[0],before);
 s=lyrics.advanceLyricWork(started.state,1000).state;assert.equal(s.projects[0].revision,2);assert.equal(s.projects[0].sections.at(-1).type,'diss');
 let eight=create({battleId:'yard-cipher'});for(let i=0;i<3;i++)eight=finish(eight);assert.equal(lyrics.startLyricWork(eight,{projectId:'words-1',kind:'diss'}).ok,false);
});
test('invalid documents/jobs normalize safely, and work cannot overlap a beat job',()=>{
 assert.equal(lyrics.normalizeLyric({kind:'lyrics'}),null);
 let s=create();s.music.job={beatId:'another'};assert.equal(lyrics.startLyricWork(s,{projectId:'words-1',kind:'stage'}).ok,false);
 s=create();s.writing.job={projectId:'missing',elapsed:NaN,total:-1};assert.equal(createVirtualPcState(s).writing.job,null);
});
test('adaptation keeps selected beat and tightens novice line lengths through saved work',()=>{
 let s=create();for(let i=0;i<3;i++)s=finish(s);s.music.needs={satiety:100,energy:100};
 s=createBeat(s,{id:'beat',name:'Осенний бит'},{beatmaking:10,sound:10},()=>.2).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=startBeatStage(s,'beat',undefined,{beatmaking:10},()=>.4).state;s=advanceBeatWork(s,1000).state;}
 s.music.needs={satiety:100,energy:100};const r=lyrics.startLyricWork(s,{projectId:'words-1',kind:'adapt',beatId:'beat',gameDay:2},{writing:10});assert.equal(r.ok,true);assert.equal(r.state.projects[0].adaptation,null);
 s=lyrics.advanceLyricWork(createVirtualPcState(r.state),1000).state;const p=s.projects[0];assert.equal(p.adaptation.beatId,'beat');assert.equal(p.revision,2);assert.equal(p.updatedDate,'02.09.2012');
 const sizes=p.sections[0].lines.map(l=>l.words.length);assert.ok(Math.max(...sizes)-Math.min(...sizes)<=3);assert.deepEqual(createVirtualPcState(s).projects[0],p);
});
test('adding a verse preserves the existing written lines',()=>{
 let s=create();for(let i=0;i<3;i++)s=finish(s);s.music.needs={satiety:100,energy:100};const sections=structuredClone(s.projects[0].sections);
 s=finish(s,{writing:10},'story');assert.deepEqual(s.projects[0].sections.slice(0,sections.length),sections);
});

test('visible lyric decisions change structure while reopening keeps the saved result',()=>{
 let good=create(),bad=create();
 for(let i=0;i<3;i++){
  good=finish(good,{writing:60},'stage',{sliders:lyrics.LYRIC_STAGES[i].target});
  bad=finish(bad,{writing:60},'stage',{sliders:lyrics.LYRIC_STAGES[i].target.map(v=>v>=5?0:10)});
 }
 assert.ok(good.projects[0].sections.length>bad.projects[0].sections.length);
 assert.deepEqual(createVirtualPcState(good).projects[0].sections,good.projects[0].sections);
});

test('a new verse reflects current writing ability without rewriting its older lines',()=>{
 let s=create();for(let i=0;i<3;i++)s=finish(s);s.music.needs={satiety:100,energy:100};
 const novice=finish(s,{writing:10},'story'),expert=finish(s,{writing:99},'story');
 assert.deepEqual(expert.projects[0].sections.slice(0,-1),s.projects[0].sections);
 assert.notDeepEqual(expert.projects[0].sections.at(-1),novice.projects[0].sections.at(-1));
 const lines=expert.projects[0].sections.at(-1).lines;assert.equal(lines.length,8);assert.ok(lines.every(l=>l.words.every(w=>!w.error)));
});
