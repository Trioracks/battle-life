import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const api = await import('../../tools/audio/beat-skill-ladder.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
function fn(name) {
  assert.equal(typeof api[name], 'function', `preview feature missing: ${name}`);
  return api[name];
}
const rate = 12000;
const tone = (hz, seconds = 1) => Float32Array.from({length: rate * seconds}, (_, i) => .1 * Math.sin(2 * Math.PI * hz * i / rate));
const rms = x => Math.sqrt(x.reduce((sum, value) => sum + value * value, 0) / x.length);
const energy = (x, hz, start = 2400, end = x.length - 2400) => {
  let re = 0, im = 0;
  for (let i = start; i < end; i++) {
    re += x[i] * Math.cos(2 * Math.PI * hz * i / rate);
    im += x[i] * Math.sin(2 * Math.PI * hz * i / rate);
  }
  return Math.hypot(re, im) * 2 / (end - start);
};

test('detune moves a 440 Hz tone near the independently calculated 554.365 Hz target without changing duration', () => {
  const source = tone(440,2), out = fn('detunePcm')([source],rate,400)[0];
  assert.equal(out.length,24000);
  // 440 * 2^(400/1200) = 554.36526195, independent physical expectation.
  assert.ok(energy(out,554.36526195) > .055);
  assert.ok(energy(out,440) < .012);
});

test('every role is exactly dry at 50 and above, sources remain untouched', () => {
  const process = fn('processRole'), input = [tone(440),tone(880)], prior = input.map(c=>c.slice());
  for(const role of ['drums','bass','melody']) for(const level of [50,60,100]) assert.deepEqual(process(input,rate,role,level,level),input);
  for(const role of ['drums','bass','melody']) process(input,rate,role,0,0);
  assert.deepEqual(input,prior);
});

test('each defect graph converges continuously to dry immediately below skill 50', () => {
  const process=fn('processRole'), input=tone(440);
  for(const role of ['drums','bass','melody']) {
    const out=process([input],rate,role,49.9999,49.9999)[0];
    let maxDelta=0;
    for(let i=0;i<input.length;i++)maxDelta=Math.max(maxDelta,Math.abs(input[i]-out[i]));
    assert.ok(maxDelta<.00001,role+': '+maxDelta);
  }
});

test('stereo detuning uses identical control and maintains proportional channels', () => {
  const input = tone(440), out = fn('detunePcm')([input,Float32Array.from(input,x=>x*.5)],rate,-460);
  // Shared analysis retains proportion within Float32 FFT roundoff (< -120dB).
  for(let i=0;i<input.length;i++)assert.ok(Math.abs(out[0][i]*.5-out[1][i]) < 1e-6);
});

test('source preparation resamples a short take once and pads silence instead of repeating the voice', () => {
  const prepare=fn('prepareSourcePcm');
  const input=Float32Array.from({length:9600},(_,i)=>.1*Math.sin(2*Math.PI*440*i/48000));
  const prior=input.slice(), out=prepare({sampleRate:48000,channels:[input]},rate,1);
  assert.equal(out[0].length,12000);
  assert.ok(energy(out[0],440,120,2280)>.095);
  assert.ok(out[0].subarray(2400).every(x=>x===0));
  assert.deepEqual(input,prior);
  const dry=Float32Array.of(.1,.2,.3);
  assert.deepEqual(prepare({sampleRate:rate,channels:[dry]},rate,3/rate),[dry]);
});

const miniature = () => ({sampleRate:rate,durationSeconds:1,outputGain:.75,parts:[
  {id:'d',role:'drums',channels:[tone(4000)],sourceGainDb:-6,windows:[{startBar:0,bars:.375,sourceBar:0}]},
  {id:'b',role:'bass',channels:[tone(60)],sourceGainDb:-3,windows:[{startBar:0,bars:.375,sourceBar:0}]},
  {id:'m',role:'melody',channels:[tone(440)],sourceGainDb:0,windows:[{startBar:0,bars:.375,sourceBar:0}]},
  {id:'v',role:'vocal',channels:[tone(900)],sourceGainDb:-4,windows:[{startBar:0,bars:.375,sourceBar:0}]}
]});

test('all six share identical voice PCM and gain, replay deterministically, and match separately dry-rendered 50', () => {
  const render = fn('renderLadder'), input = miniature(), prior = structuredClone(input);
  const got = render(input), again = render(input);
  assert.deepEqual(got.variants.map(v=>v.level),[0,10,20,30,40,50]);
  for(const v of got.variants) { assert.deepEqual(v.vocalChannels,got.variants[0].vocalChannels); assert.equal(v.channels[0].length,12000); }
  assert.deepEqual(got.variants[5].channels,got.dryReference.channels);
  // Known sample: calibration(-4dB) * saved output .75 * shared gain; arrangement is fully open at .25s.
  const at=3001, want=input.parts[3].channels[0][at]*10**(-4/20)*.75*got.sharedGain;
  assert.ok(Math.abs(got.variants[0].vocalChannels[0][at]-want)<1e-8);
  assert.deepEqual(got,again); assert.deepEqual(input,prior);
});

test('old result/vocal damage metadata cannot change the new isolated graph', () => {
  const render = fn('renderLadder'), original = miniature(), poisoned = miniature();
  for(const part of poisoned.parts) {part.result={quality:0,skills:{beatmaking:0,sound:0},fit:0}; part.vocal={quality:0,postGain:100,vocalGainDb:99};}
  assert.deepEqual(render(original),render(poisoned));
});

test('one shared headroom gain prevents clipping in floating PCM and safe encoder rejects bad PCM', () => {
  const input=miniature(); for(const p of input.parts) for(const c of p.channels) for(let i=0;i<c.length;i++)c[i]*=20;
  const got=fn('renderLadder')(input);
  assert.ok(got.sharedGain>0&&got.sharedGain<1);
  for(const v of [...got.variants,got.dryReference]) for(const channel of v.channels) for(const sample of channel) assert.ok(Number.isFinite(sample)&&Math.abs(sample)<=.951);
  const encode=fn('encodeSafePcm16');
  assert.throws(()=>encode({sampleRate:rate,channels:[Float32Array.of(1.01)]}),/clip/i);
  assert.throws(()=>encode({sampleRate:rate,channels:[Float32Array.of(NaN)]}),/finite/i);
  const wav=encode({sampleRate:rate,channels:[Float32Array.of(0,.5,-.5)]});
  assert.equal(wav.toString('ascii',0,4),'RIFF'); assert.equal(wav.readUInt32LE(24),12000);
  assert.equal(wav.readInt16LE(46),16384); assert.equal(wav.readInt16LE(48),-16383);
});

test('artifact writer saves six safe WAVs with hashes and refuses replacement; verify-only replays bytes', async () => {
  const writer = await import('../../tools/render-beat-skill-ladder.mjs').catch(error=>{
    if(error.code==='ERR_MODULE_NOT_FOUND')return {};
    throw error;
  });
  assert.equal(typeof writer.writePreview,'function','new preview writer missing');
  await mkdir(join(tmpdir(),'beat-skill-ladder-session'),{recursive:true});
  const outputDir=await mkdtemp(join(tmpdir(),'beat-skill-ladder-session-render-test-'));
  const recipe={...miniature(),provenance:'Test PCM fixture',demoSeed:33};
  const manifest=await writer.writePreview({recipe,outputDir});
  assert.equal(manifest.variants.length,6);
  const sha=data=>createHash('sha256').update(data).digest('hex');
  for(const [index,filename] of ['skill-00.wav','skill-10.wav','skill-20.wav','skill-30.wav','skill-40.wav','skill-50.wav'].entries()) {
    const bytes=await readFile(outputDir+'/'+filename);
    assert.equal(bytes.length,48044); assert.equal(bytes.readUInt16LE(22),2);
    assert.equal(sha(bytes),manifest.variants[index].sha256);
    assert.equal(manifest.variants[index].vocalSha256,manifest.variants[0].vocalSha256);
  }
  assert.deepEqual(await readFile(outputDir+'/skill-50.wav'),await readFile(outputDir+'/dry-reference.wav'));
  assert.equal(JSON.parse(await readFile(outputDir+'/metadata.json','utf8')).processing.oldGameDspApplied,false);
  await assert.rejects(()=>writer.writePreview({recipe,outputDir}),/exists|overwrite/i);
  assert.deepEqual(await writer.writePreview({recipe,outputDir,verifyOnly:true}),manifest);
  const changed={...recipe,provenance:'Updated annotation without audio changes'};
  const refreshed=await writer.writePreview({recipe:changed,outputDir,refreshNotes:true});
  assert.equal(refreshed.provenance,changed.provenance);
  assert.equal(sha(await readFile(outputDir+'/skill-00.wav')),manifest.variants[0].sha256);
  assert.equal(JSON.parse(await readFile(outputDir+'/metadata.json','utf8')).provenance,changed.provenance);
});
