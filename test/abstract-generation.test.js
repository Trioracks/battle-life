import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseGenre} from '../src/genre-progression.js';
import {createBeat,normalizeBeat,startBeatStage} from '../src/beat-production.js';
import {chooseBeginnerParts,beginnerById} from '../src/beat-beginner-bank.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {SOURCE_GAINS_DB} from '../src/source-levels.js';
const abstract=await import('../src/beat-abstract-bank.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const leads=await import('../src/beat-experimental-leads-bank.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const manifest=JSON.parse(await readFile(new URL('../assets/audio/ft/abstract-v1/manifest.json',import.meta.url)));
const sequence=(...values)=>()=>values.shift();
function state(){const s=createVirtualPcState();s.music.genres=chooseGenre(s.music.genres,'abstract',25).value;return s;}

test('abstract unlocks at 25 with zero genre experience',()=>{
 const s=createVirtualPcState();assert.equal(chooseGenre(s.music.genres,'abstract',24.99).ok,false);
 const selected=chooseGenre(s.music.genres,'abstract',25);assert.equal(selected.ok,true);assert.equal(selected.value.xp.abstract,0);
 s.music.genres=selected.value;
 const made=createBeat(s,{id:'abstract',name:'Abstract',genre:'abstract'},{beatmaking:25},sequence(0,0));assert.equal(made.ok,true);
 const b=made.state.projects[0];assert.equal(b.genreProfile.xp,0);
 assert.deepEqual([b.drumId,b.audio.themeId,b.audio.arrangementId],['abstract-20261020-track-01-01-02-drums','abstract-20261020-track-01-01-02-theme','abstract-20261020-track-01-01-02-arrangement']);
});

test('all 43 recipes keep family and consecutive indices',()=>{
 assert.equal(typeof abstract.chooseAbstractRecipe,'function');assert.equal(abstract.ABSTRACT_RECIPES.length,43);
 const seen=new Set();
 for(const [family,count] of [[0,8],[1,10],[2,6],[3,19]])for(let pair=0;pair<count;pair++){
  const random=sequence((family+.5)/4,(pair+.5)/count),picked=abstract.chooseAbstractRecipe(random);
  assert.equal(picked.family,'Track 0'+(family+1));assert.deepEqual(picked.indices,[pair+1,pair+2]);seen.add(picked.id);
  const b=createBeat(state(),{id:'a-'+family+'-'+pair,name:'A',genre:'abstract'},{beatmaking:25},sequence((family+.5)/4,(pair+.5)/count)).state.projects[0];
  const ids=[b.drumId,b.audio.themeId,b.audio.arrangementId],parts=ids.map(beginnerById);
  assert.deepEqual(parts.map(p=>p.role),['drums','lead','bass']);
  assert.ok(parts.every(p=>p.family===picked.family&&JSON.stringify(p.indices)===JSON.stringify(picked.indices)));
  const saved=createVirtualPcState(JSON.parse(JSON.stringify({...state(),projects:[b]}))).projects[0];
  assert.deepEqual(saved,b);assert.equal(saved.audio.abstractRecipe.id,picked.id);
  assert.deepEqual(ids.map(id=>beginnerById(id).sourceHashes),manifest.parts.filter(p=>ids.includes(p.id)).sort((a,c)=>ids.indexOf(a.id)-ids.indexOf(c.id)).map(p=>p.sourceHashes));
  const playable=resolveBeatPlayback({...saved,stages:[{},{},{}]});assert.equal(playable.ok,true);
  assert.deepEqual(playable.descriptor.parts.map(p=>p.id),ids);assert.ok(ids.every(id=>Number.isFinite(SOURCE_GAINS_DB[id])));
 }
 assert.equal(seen.size,43);
});

test('abstract random draws clamp independently and ignore genre XP',()=>{
 assert.equal(typeof abstract.chooseAbstractRecipe,'function');
 for(const [first,second,family,indices] of [[-2,2,'Track 01',[8,9]],[2,-2,'Track 04',[1,2]]]){
  const pick=abstract.chooseAbstractRecipe(sequence(first,second));assert.equal(pick.family,family);assert.deepEqual(pick.indices,indices);
 }
 for(const genreXP of [0,50,100])assert.equal(chooseBeginnerParts(()=>0,{genre:'abstract',genreXP,skill:25}).abstractRecipe.id,'abstract-20261020-track-01-01-02');
});

test('abstract rejects nonfinite and nonnumber first or second draws without selecting a recipe',()=>{
 for(const invalid of [NaN,Infinity,-Infinity,undefined,null,'0',{},true])for(const position of [0,1]){
  let calls=0;const values=position===0?[invalid,0]:[0,invalid];
  assert.throws(()=>abstract.chooseAbstractRecipe(()=>values[calls++]),/finite number/);
  assert.equal(calls,position+1);
 }
 let calls=0;const picked=abstract.chooseAbstractRecipe(()=>{calls++;return .5;});
 assert.equal(calls,2);assert.equal(picked.family,'Track 03');assert.deepEqual(picked.indices,[4,5]);
});

test('corrupt abstract recipe is preserved and blocked without selecting replacement sources',()=>{
 const b=createBeat(state(),{id:'a',name:'A',genre:'abstract'},{beatmaking:25},()=>0).state.projects[0];
 assert.ok(b?.audio.abstractRecipe);
 for(const mutate of [p=>p.audio.abstractRecipe.id='unknown',p=>p.audio.abstractRecipe.indices=[2,3],p=>p.audio.abstractRecipe.indices=Array(2),p=>p.audio.abstractRecipe.family='Track 04',p=>p.audio.abstractRecipe.version=2,p=>p.audio.themeId='beginner-theme-17',p=>p.drumId='beginner-drums-17',p=>p.audio.arrangementId='beginner-arrangement-17',p=>delete p.audio.abstractRecipe]){
  const broken=structuredClone(b);mutate(broken);const saved=normalizeBeat(broken);
  assert.equal(saved.audioIssue,'invalid-abstract-recipe');assert.deepEqual(saved.audio.abstractRecipe,broken.audio.abstractRecipe);
  assert.equal(resolveBeatPlayback({...saved,stages:[{},{},{}]}).ok,false);
  assert.equal(startBeatStage({...state(),projects:[saved]},'a',[5,5,5],{beatmaking:25}).ok,false);
 }
});

test('all 13 experimental lead recipes reach new projects with their verified partners',()=>{
 assert.equal(leads.EXPERIMENTAL_LEAD_RECIPES?.length,13);
 const seen=new Set(),families=['07','01','06','04','03','03','05','05','01','07','04','07','01'];
 for(let i=0;i<13;i++){
  // 14 released recipes + 13 new recipes fill the retained one-third pool.
  const random=()=>(14+i+.5)/81,parts=chooseBeginnerParts(random,{genre:'experimental',genreXP:0,skill:25});
  const expected=['user-experimental-20261015-family-'+families[i]+'-drums','experimental-lead-20261020-'+String(i+1).padStart(2,'0'),'user-experimental-20261015-family-'+families[i]+'-bass'];
  seen.add(parts.themeId);assert.deepEqual([parts.drumsId,parts.themeId,parts.arrangementId],expected);
  assert.ok(Number.isFinite(SOURCE_GAINS_DB[parts.themeId]));
  const b=createBeat(createVirtualPcState(),{id:'e',name:'E'},{beatmaking:25},random).state.projects[0];
  assert.deepEqual([b.drumId,b.audio.themeId,b.audio.arrangementId],expected);
  assert.deepEqual(normalizeBeat(JSON.parse(JSON.stringify(b))),b);
 }
 assert.equal(seen.size,13);
});
