import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const api=await import('../tools/audio/gans-mix-preview.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const fn=name=>{assert.equal(typeof api[name],'function',`missing local GANS behavior: ${name}`);return api[name];};
const rate=12000,bar=8/3;
const tone=(hz,seconds,gain=.05)=>Float32Array.from({length:Math.round(seconds*rate)},(_,i)=>gain*Math.sin(2*Math.PI*hz*i/rate));
function recipe(){const voice=new Float32Array(Math.round(5.1*rate));for(const [a,b] of [[.2,1.2],[1.5,2.6],[2.9,3.9],[4.2,5.02]])for(let i=Math.round(a*rate);i<b*rate;i++)voice[i]=.1*Math.sin(2*Math.PI*440*i/rate);return {sampleRate:rate,voice:{id:'gans-test-take',path:'fixture-only',sourceGainDb:-3,channels:[voice]},parts:[['d','drums',3000],['m','melody',600],['b','bass',80]].map(([id,role,hz])=>({id,role,sourceGainDb:-3,channels:[tone(hz,bar*4)]})),flow:25,beatmaking:50,genreXP:100,seed:33};}
const rms=channels=>Math.sqrt(channels.reduce((s,c)=>s+c.reduce((a,x)=>a+x*x,0),0)/(channels.length*channels[0].length));

// Catches repeated identical processed take, extra rerolls during mastering,
// lost second tails, variable gain matching and per-file clipping fixes.
test('GANS local comparison keeps fixed sources with independent repeat plans and exact mastering laws',()=>{
  const input=recipe(),prior=structuredClone(input),out=fn('renderGansMix')(input);
  assert.equal(out.frames,256000);assert.equal(out.durationSeconds,64/3);assert.equal(out.flow,25);assert.equal(out.beatmaking,50);assert.equal(out.genreXP,100);
  assert.equal(out.before.occurrences.length,1);assert.equal(out.after.occurrences.length,2);
  assert.deepEqual(out.before.occurrences[0].plan.events.map(e=>e.timingActive),out.after.occurrences[0].plan.events.map(e=>e.timingActive));
  assert.notEqual(out.after.occurrences[0].seed,out.after.occurrences[1].seed);
  assert.notDeepEqual(out.after.occurrences[0].plan.events.map(e=>e.requestedOffsetSeconds),out.after.occurrences[1].plan.events.map(e=>e.requestedOffsetSeconds));
  assert.notDeepEqual(out.after.occurrences[0].channels,out.after.occurrences[1].channels);
  for(let i=0;i<out.before.occurrences[0].plan.events.length;i++){
    const a=out.before.occurrences[0].plan.events[i],b=out.after.occurrences[0].plan.events[i];
    for(const field of ['offsetSeconds','tempoAmplitude','accentDb','endDb'])assert.ok(Math.abs(b[field]-a[field]*.9)<1e-10,field);
  }
  assert.ok(Math.abs(out.masterGain-1.1885022274370185)<1e-12);
  // Literal -2dB baseline and +1.5dB master coefficients, checked on actual
  // output samples so a correct metadata constant cannot hide missing gain.
  const afterGain=.776895649542515*.7943282347242815*1.1885022274370185*out.sharedGain;
  for(let i=0;i<out.frames;i+=97)for(let ch=0;ch<2;ch++)assert.ok(Math.abs(out.after.channels[ch][i]-out.after.preOutputChannels[ch][i]*afterGain)<1e-7);
  for(const part of out.before.beat)assert.equal(part.parameters.severity,.08);
  for(const part of out.after.beat)assert.ok(Math.abs(part.parameters.severity-.072)<1e-12);
  assert.ok(Math.abs(rms(out.matched.channels)-rms(out.before.channels))<1e-8);
  for(let ch=0;ch<2;ch++)for(let i=0;i<out.frames;i++)assert.ok(Math.abs(out.matched.channels[ch][i]-out.after.channels[ch][i]*out.matchGain)<1e-7);
  const mainStart=2*bar,mainEnd=6*bar;
  for(const occ of out.after.occurrences){assert.ok(occ.startSeconds>=mainStart&&occ.endSeconds<=mainEnd);assert.ok(occ.sourceFrames>=Math.round(5.1*rate));}
  assert.ok(out.after.occurrences[1].endSeconds>mainEnd-.4);
  for(const v of [out.before,out.after,out.matched])for(const c of v.channels)assert.ok(c.every(x=>Number.isFinite(x)&&Math.abs(x)<=.951));
  assert.deepEqual(input,prior);assert.deepEqual(fn('renderGansMix')(input),out);
});

test('GANS refuses a take that cannot fit two complete main-section performances',()=>{
  const render=fn('renderGansMix'),input=recipe();input.voice.channels=[tone(440,5.6)];assert.throws(()=>render(input),/fit|long|duration/i);
});

test('actual GANS source and new beat fit940800frames with both full source performances',async()=>{
  const {loadGansRecipe}=await import('../tools/render-gans-mix-preview.mjs'),input=await loadGansRecipe(new URL('../',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
  const out=fn('renderGansMix')(input);
  assert.equal(out.frames,940800);assert.equal(out.voiceId,'npc-gans-01');assert.deepEqual(out.beatIds,['gans-experimental-20261018-drums-2','gans-experimental-20261018-lead-2','gans-experimental-20261018-bass-3']);
  assert.equal(input.voice.sourceFrames,248333);assert.equal(input.voice.sourceRate,48000);
  assert.equal(out.after.occurrences[1].endSeconds,16);assert.ok(input.voice.sourceFrames/input.voice.sourceRate<16/3);
  for(const occ of out.after.occurrences){assert.equal(occ.channels[0].length,235200);assert.ok(occ.channels[0].subarray(Math.round(4.8*44100),Math.round(5.17*44100)).some(x=>Math.abs(x)>.005));}
  assert.notDeepEqual(out.after.occurrences[0].channels,out.after.occurrences[1].channels);
});

test('GANS writer creates only three new safe files, refuses replacement and verifies read-only',async()=>{
  const writer=await import('../tools/render-gans-mix-preview.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
  assert.equal(typeof writer.writeGansPreview,'function','missing local GANS writer');
  await mkdir('artifacts/gans-mix-session',{recursive:true});const outputDir=await mkdtemp('artifacts/gans-mix-session/test-'),input=recipe();
  const manifest=await writer.writeGansPreview({recipe:input,outputDir});assert.equal(manifest.variants.length,3);
  const times=await Promise.all((await readdir(outputDir)).map(async name=>[name,(await stat(outputDir+'/'+name)).mtimeMs]));
  assert.deepEqual(await writer.writeGansPreview({recipe:input,outputDir,verifyOnly:true}),manifest);
  assert.deepEqual(await Promise.all((await readdir(outputDir)).map(async name=>[name,(await stat(outputDir+'/'+name)).mtimeMs])),times);
  await assert.rejects(()=>writer.writeGansPreview({recipe:input,outputDir}),/overwrite/i);
  for(const v of manifest.variants){const bytes=await readFile(outputDir+'/'+v.filename);assert.equal(createHash('sha256').update(bytes).digest('hex'),v.sha256);}
});
