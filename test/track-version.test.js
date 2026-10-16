import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {createVirtualPcState,loadVirtualPcState,saveVirtualPcState,VIRTUAL_PC_STORAGE_KEY} from '../src/virtual-pc-state.js';
import {legacySubmissionFixture} from './helpers/submission-fixtures.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
const api=await import('../src/track-version.js').catch(()=>({}));
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {beatOutcomes} from '../src/production-outcomes.js';
function capture(state){assert.equal(typeof api.captureTrackVersion,'function');return api.captureTrackVersion(state,{projectId:'beat',nowMinute:600});}

test('first completed mix saves form once; clean, remix and master retain windows and archived recipes',()=>{
 let s=submissionFixture(),beat=s.projects.find(p=>p.id==='beat');beat.recording.draft.seed=15;s.music.needs={satiety:100,energy:100};
 s=startVocalWork(s,{beatId:'beat',kind:'mix'},{},()=>.4).state;s=advanceVocalWork(s,1).state;
 assert.equal(s.projects.find(p=>p.id==='beat').songForm,undefined,'incomplete mixing cannot choose a form');
 s=advanceVocalWork(createVirtualPcState(JSON.parse(JSON.stringify(s))),1000).state;beat=s.projects.find(p=>p.id==='beat');
 assert.equal(beat.songForm?.version,1);
 assert.ok(resolveBeatPlayback(beat).descriptor.parts.some(p=>p.songSection),'lifecycle fixture contains a real alternative');
 const form=structuredClone(beat.songForm),initial=capture(s);s=initial.state;
 const exportedRecipeBefore=structuredClone(s.trackVersions.byId[initial.versionId].recipe);
 for(const kind of ['clean','mix','master']){
  s=createVirtualPcState(JSON.parse(JSON.stringify(s)));s.music.needs={satiety:100,energy:100};
  const started=startVocalWork(s,{beatId:'beat',kind},{flow:75,sound:75},()=>.8);assert.equal(started.ok,true);
  s=advanceVocalWork(started.state,1000).state;beat=s.projects.find(p=>p.id==='beat');
  assert.deepEqual(beat.songForm,form);
  assert.deepEqual(resolveBeatPlayback(beat).descriptor.parts.map(p=>[p.id,p.windows]),exportedRecipeBefore.descriptor.parts.map(p=>[p.id,p.windows]),kind+' keeps the audible form even before remix');
  const exportedRecipeAfter=s.trackVersions.byId[initial.versionId].recipe;assert.deepEqual(exportedRecipeAfter,exportedRecipeBefore);
 }
 const current=resolveBeatPlayback(beat).descriptor;
 assert.deepEqual(current.parts.map(p=>[p.id,p.windows]),exportedRecipeBefore.descriptor.parts.map(p=>[p.id,p.windows]));
});

test('alternate sections cannot double-weight music quality or duplicate stage facts',()=>{
 const recipe={genre:'experimental'},parts=[0,1,2].map(stage=>({id:'layer-'+stage,result:{stage,quality:10+stage*20,skills:{beatmaking:10}}}));
 const before=beatOutcomes({recipe,descriptor:{durationSeconds:64/3,parts}});
 const after=beatOutcomes({recipe,descriptor:{durationSeconds:64/3,parts:[...parts,{...parts[1],songSection:'intro'},{...parts[0],songSection:'outro'}]}});
 assert.equal(after.qualities.music,before.qualities.music);
 assert.deepEqual(after.facts.filter(f=>f.key!=='music.form'),before.facts.filter(f=>f.key!=='music.form'));
});

test('alternate form evidence distinguishes source identity and preserves every section window',()=>{
 const recipe={genre:'experimental'},body={id:'beginner-drums-01',windows:[{startBar:2,bars:4,sourceBar:0}]};
 const intro={id:'beginner-drums-02',songSection:'intro',windows:[{startBar:0,bars:2,sourceBar:1}]};
 const outro={id:'beginner-drums-03',songSection:'outro',windows:[{startBar:6,bars:2,sourceBar:2}]};
 const form=parts=>beatOutcomes({recipe,descriptor:{durationSeconds:64/3,parts}}).facts.find(f=>f.key==='music.form');
 const first=form([body,intro,outro]),differentSource=form([body,{...intro,id:'beginner-drums-04'},outro]);
 assert.notDeepEqual(first.evidence,differentSource.evidence,'same windows with different sources must remain distinguishable');
 assert.deepEqual(first.evidence,[{path:'descriptor.parts',parts:[
  {id:'beginner-drums-01',songSection:null,windows:[{startBar:2,bars:4,sourceBar:0}]},
  {id:'beginner-drums-02',songSection:'intro',windows:[{startBar:0,bars:2,sourceBar:1}]},
  {id:'beginner-drums-03',songSection:'outro',windows:[{startBar:6,bars:2,sourceBar:2}]}
 ]}]);
 intro.windows[0].sourceBar=0;assert.equal(first.evidence[0].parts[1].windows[0].sourceBar,1,'fact owns its saved windows');
});

test('legacy form evidence retains its exact shape and archived old facts never migrate',()=>{
 const recipe={genre:'experimental'},descriptor={durationSeconds:64/3,parts:[{id:'beginner-drums-01',windows:[{startBar:0,bars:2,sourceBar:0}]},{id:'vocal-01'}]};
 const oldFact={id:'beat:form',key:'music.form',value:'intro-verse-outro',origin:'audio-recipe',evidence:[{path:'descriptor.parts.windows',windows:[[{startBar:0,bars:2,sourceBar:0}],null]}]};
 assert.deepEqual(beatOutcomes({recipe,descriptor}).facts.find(f=>f.key==='music.form'),oldFact);
 const captured=capture(submissionFixture()),version=captured.state.trackVersions.byId[captured.versionId];version.facts=version.facts.map(f=>f.key==='music.form'?oldFact:f);
 const before=structuredClone(version);const restored=createVirtualPcState(JSON.parse(JSON.stringify(captured.state)));
 assert.deepEqual(restored.trackVersions.byId[captured.versionId],before);
 assert.deepEqual(capture(restored).state.trackVersions.byId[captured.versionId],before);
});

test('legacy beats never acquire eligibility or alternate form on mix, clean or remix',()=>{
 let s=submissionFixture();delete s.projects.find(p=>p.id==='beat').songFormVersion;
 for(const kind of ['mix','clean','mix','master']){
  s=createVirtualPcState(JSON.parse(JSON.stringify(s)));s.music.needs={satiety:100,energy:100};
  s=advanceVocalWork(startVocalWork(s,{beatId:'beat',kind},{flow:75,sound:75},()=>.8).state,1000).state;
  const beat=s.projects.find(p=>p.id==='beat');assert.equal(beat.songFormVersion,undefined);assert.equal(beat.songForm,undefined);
  assert.equal(resolveBeatPlayback(beat).descriptor.parts.length,4);
 }
});

test('content mix belongs to the recorded snapshot, not a later editable text or skill',()=>{
 const first=capture(submissionFixture()),old=first.state.trackVersions.byId[first.versionId],before=JSON.stringify(old);
 const mix=old.facts.find(f=>f.key==='text.contentMix');assert.ok(mix);assert.deepEqual(mix.value,old.recipe.lyrics.contentMix);
 first.state.projects.find(p=>p.id==='lyrics').contentMix={topic:100,diss:0,lyric:0};first.state.writing.practice=80;
 const restored=createVirtualPcState(JSON.parse(JSON.stringify(first.state))),again=capture(restored);
 assert.equal(again.versionId,first.versionId);assert.equal(JSON.stringify(again.state.trackVersions.byId[first.versionId]),before);
});
test('equal audio recipes cannot reuse a snapshot with different saved facts or qualities',()=>{
 for(const field of ['facts','qualities']){
  const first=capture(submissionFixture()),old=first.state.trackVersions.byId[first.versionId];
  if(field==='facts')old.facts=[{id:'old',key:'music.groove',value:1,origin:'legacy-observed',evidence:[]}];
  else old.qualities.music=9.9;
  const before=JSON.stringify(old),next=capture(first.state);
  assert.notEqual(next.versionId,first.versionId,field+' is part of version identity');
  assert.equal(JSON.stringify(next.state.trackVersions.byId[first.versionId]),before,'old published evidence is never rewritten');
  assert.equal(capture(next.state).versionId,next.versionId,'unchanged complete snapshot still deduplicates');
 }
});

test('unchanged attachment reuses complete signature, while frozen recipe owns its copies',()=>{
 const original=submissionFixture(),saved=capture(original);assert.equal(saved.ok,true);
 const version=saved.state.trackVersions.byId[saved.versionId],frozen=JSON.stringify(version);
 assert.equal(capture(saved.state).versionId,saved.versionId);
 original.projects.find(p=>p.id==='beat').mix.layers[0].quality=100;
 saved.state.projects.find(p=>p.id==='lyrics').name='Переписано';
 saved.state.music.practice=100;saved.state.recording.practice.flow=100;
 assert.equal(JSON.stringify(version),frozen);
 const restored=createVirtualPcState(JSON.parse(JSON.stringify(saved.state)));
 assert.deepEqual(restored.trackVersions.byId[saved.versionId],version);
 restored.projects=[];assert.deepEqual(createVirtualPcState(restored).trackVersions.byId[saved.versionId],version);
});

test('new clean recording produces a new version but old audio and evidence never change',()=>{
 let saved=capture(submissionFixture()),s=saved.state;
 const before=JSON.stringify(s.trackVersions.byId[saved.versionId]);
 s.music.needs={satiety:100,energy:100};
 s=advanceVocalWork(startVocalWork(s,{beatId:'beat',kind:'clean'},{flow:75,sound:75},()=>.8).state,1000).state;
 const next=capture(s);assert.equal(next.ok,true);assert.notEqual(next.versionId,saved.versionId);
 assert.equal(JSON.stringify(next.state.trackVersions.byId[saved.versionId]),before);
});

test('unsupported versions are kept in recovery and unavailable projects are never substituted',()=>{
 const s=submissionFixture(),bad=capture(s);
 bad.state.trackVersions.byId[bad.versionId].schemaVersion=987;
 const recovered=api.normalizeTrackVersions(bad.state.trackVersions);
 assert.equal(Object.keys(recovered.byId).length,0);assert.equal(recovered.recovery.length,1);
 s.projects.find(p=>p.id==='beat').audio.themeId='missing';
 assert.equal(capture(s).ok,false);
 const unfinished=submissionFixture({vocal:false});assert.equal(capture(unfinished).ok,false);
});

test('package migration reserves original data; quota failure cannot rewrite old save',()=>{
 const state=submissionFixture();delete state.trackVersions;
 const raw=JSON.stringify(state),data=new Map([[VIRTUAL_PC_STORAGE_KEY,raw]]);
 const storage={getItem:k=>data.get(k)??null,setItem(k,v){if(k.endsWith('-before-track-versions'))throw Error('quota');data.set(k,v);}};
 const result=loadVirtualPcState(storage);
 assert.equal(result.ok,false);assert.equal(result.reason,'track-versions-backup-failed');
 assert.equal(saveVirtualPcState(storage,result.state),false);
 assert.equal(data.get(VIRTUAL_PC_STORAGE_KEY),raw);
});

test('valid historical submission gets a frozen version once, not the later edited project',()=>{
 let s=legacySubmissionFixture();
 delete s.trackVersions;
 delete s.battleSubmissions[0].trackVersionId;delete s.battleSubmissions[0].timePrecision;
 s.projects.find(p=>p.id==='beat').name='Новая рабочая копия';
 const migrated=createVirtualPcState(s),submission=migrated.battleSubmissions[0];
 assert.ok(submission.trackVersionId);
 const version=migrated.trackVersions.byId[submission.trackVersionId];
 assert.equal(version.name,s.battleSubmissions[0].track.name);
 assert.equal(version.createdAtMinute,1440);
 assert.deepEqual(createVirtualPcState(migrated).trackVersions,migrated.trackVersions);
});
