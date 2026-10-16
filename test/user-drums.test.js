import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as bank from '../src/beat-beginner-bank.js';
import {createBeat,normalizeBeat} from '../src/beat-production.js';
import * as source from '../tools/audio/source-loop.mjs';
test('ten author patterns supplement a third of novice choices and stop at skill 50',()=>{
 const counts=new Map();let author=0;
 for(let i=0;i<90;i++){
  const random=()=> (i+.5)/90;
  const state={projects:[],music:{genres:{version:1,xp:{experimental:50}}}};
  const s=createBeat(state,{id:'p'+i,name:'Beat'},{beatmaking:49.99},random);
  assert.equal(s.ok,true);const b=s.state.projects[0],part=bank.beginnerById(b.drumId);
  if(part?.id.startsWith('user-drums-20261012-')){author++;counts.set(part.id,(counts.get(part.id)||0)+1);assert.equal(part.key,null);}
  assert.equal(normalizeBeat(JSON.parse(JSON.stringify(b))).drumId,b.drumId);
  const high=createBeat(state,{id:'h'+i,name:'Beat'},{beatmaking:50},random);
  assert.equal(high.state.projects[0].drumId.startsWith('user-drums-20261012-'),false);
 }
 assert.equal(author,30);assert.equal(counts.size,10);assert.ok([...counts.values()].every(n=>n===3));
});
test('drum preparation repeats musical cycles and folds tails without adding empty bars',()=>{
 assert.equal(typeof source.repeatDrumCycle,'function');
 const rate=12000,cycle=32000,input=new Float32Array(cycle+2000);input[100]=.2;input[cycle+100]=.05;
 const result=source.repeatDrumCycle({sampleRate:rate,channels:[input],cycleBars:1});
 assert.equal(result.channels[0].length,128000);
 for(let bar=0;bar<4;bar++)assert.ok(Math.abs(result.channels[0][bar*cycle+100]-.25)<1e-7);
 assert.equal(input[100],Math.fround(.2));
 assert.throws(()=>source.repeatDrumCycle({sampleRate:rate,channels:[new Float32Array(100)],cycleBars:1}),/short/i);
});


test('user drum text manifest keeps ten one-bar cycle sources in the drums catalog',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../assets/audio/ft/user-drums-v1/manifest.json',import.meta.url)));
 assert.equal(bank.USER_DRUM_BANK.length,10);assert.equal(manifest.parts.length,10);
 for(const part of manifest.parts){assert.equal(part.cycleBars,1);assert.equal(bank.beginnerById(part.id).kind,'drums');assert.match(part.sha256,/^[a-f0-9]{64}$/);assert.match(part.sourceHash,/^[a-f0-9]{64}$/);}
});
