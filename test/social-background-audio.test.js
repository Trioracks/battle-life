import test from 'node:test';
import assert from 'node:assert/strict';
import {SOCIAL_COMMUNITIES} from '../src/social-catalog.js';
import {BEGINNER_RECIPES,beginnerById} from '../src/beat-beginner-bank.js';
import {SOURCE_GAINS_DB} from '../src/source-levels.js';
import {createSocialAudio} from '../src/social-audio-view.js';
import {exportedSubmissionFixture} from './helpers/submission-fixtures.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
const api=await import('../src/social-background-audio.js').catch(()=>({}));
const demos=SOCIAL_COMMUNITIES.flatMap(c=>c.audio);
function descriptor(id){
 assert.equal(typeof api.backgroundAudioDescriptor,'function','authored archive descriptor API exists');
 return api.backgroundAudioDescriptor(id);
}

// A seed-only shuffle can keep two authors on the same melody family.
test('six archive IDs select distinct compatible calibrated melody families',()=>{
 const families=new Set(),themes=new Set();
 for(const demo of demos){
  const d=descriptor(demo.id),sources=d.parts.map(p=>beginnerById(p.id));
  assert.equal(d.owner,'social');assert.equal(d.key,'social-background:'+demo.id);
  assert.equal(d.levelVersion,1);assert.ok(d.outputGain>0&&d.outputGain<=1);
  assert.equal(d.mix,null);assert.equal(d.parts.length,3);
  assert.deepEqual(sources.map(s=>s.kind),['drums','theme','arrangement']);
  const recipe=BEGINNER_RECIPES.find(r=>r.drumsId===sources[0].id&&r.themeId===sources[1].id&&r.arrangementId===sources[2].id);
  assert.ok(recipe,'source trio is an existing compatible recipe');families.add(recipe.family);themes.add(sources[1].id);
  for(const [i,part]of d.parts.entries()){
   assert.equal(sources[i].bpm,90);assert.equal(sources[i].bars,4);assert.equal(sources[i].key,'A minor');
   assert.ok(Number.isFinite(SOURCE_GAINS_DB[part.id]));assert.equal(part.sourceGainDb,SOURCE_GAINS_DB[part.id]);
   assert.ok(Math.abs(part.loopSeconds-32/3)<1e-9);
  }
 }
 assert.equal(themes.size,6);assert.equal(families.size,6);
});

// Missing windows regress to an unarranged four-bar loop; missing exits leave
// the full trio playing through the outro.
test('each demo has an active two-bar intro, four-bar body and two-bar outro with layer entrances and exits',()=>{
 for(const demo of demos){
  const d=descriptor(demo.id);assert.ok(Math.abs(d.durationSeconds-64/3)<1e-9);
  const active=[0,2,6].map(start=>d.parts.filter(p=>p.windows.some(w=>w.startBar===start)).length);
  assert.deepEqual(active,[1,3,1],demo.id+' has a sparse intro and outro around its full body');
  for(const part of d.parts){
   assert.ok(part.windows.length);assert.ok(part.windows.some(w=>w.startBar===2&&w.bars===4&&w.sourceBar===0));
   for(const w of part.windows){
    assert.ok([[0,2],[2,4],[6,2]].some(([start,bars])=>w.startBar===start&&w.bars===bars));
    assert.ok(Number.isInteger(w.sourceBar)&&w.sourceBar>=0&&w.sourceBar+w.bars<=4);
   }
  }
 }
});

test('unknown IDs cannot fabricate audio and returned recipes cannot mutate later reads',()=>{
 for(const id of ['missing','',null,undefined,{id:demos[0].id}])assert.equal(descriptor(id),null);
 const first=descriptor(demos[0].id),before=structuredClone(first);first.parts[0].id='changed';first.parts[1].windows[0].bars=99;
 assert.deepEqual(descriptor(demos[0].id),before);assert.deepEqual(descriptor(demos[0].id),descriptor(demos[0].id));
});

test('archive row receives arranged descriptor and displays its duration',async()=>{
 const played=[],view=createSocialAudio({playDescriptor:async d=>{played.push(d);return true;}}),d=pcDocument(),row=view.row(d,{item:demos[0]});
 assert.equal(allPc(row).find(n=>n.className==='sn-audio-duration').textContent,'0:21');
 findButton(row,'Слушать: '+demos[0].author+' — '+demos[0].title).click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(played.length,1);assert.deepEqual(played[0],descriptor(demos[0].id));view.dispose();
});

test('generating archive demos leaves frozen export and track-version descriptors unchanged',async()=>{
 const state=exportedSubmissionFixture({mixed:true}),before=structuredClone(state),file=state.audioExports.files[0],version=state.trackVersions.byId[file.trackVersionId];
 for(const demo of demos)descriptor(demo.id);
 const played=[],view=createSocialAudio({playDescriptor:async d=>{played.push(d);return true;}}),d=pcDocument(),row=view.row(d,{version,item:demos[0]});
 findButton(row,'Слушать: '+version.name).click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(played.length,1);assert.deepEqual(played[0].parts,before.trackVersions.byId[version.id].recipe.descriptor.parts);
 assert.equal(played[0].key,'version:'+version.id);assert.deepEqual(state,before);view.dispose();
});
