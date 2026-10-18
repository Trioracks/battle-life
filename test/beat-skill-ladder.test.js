import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const api = await import('../tools/audio/beat-skill-ladder.mjs').catch(error => {
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

test('both skills limit the result symmetrically and cannot produce a boost', () => {
  const skill = fn('effectiveSkill');
  for (const [b, g, want] of [[50,10,10],[10,50,10],[0,50,0],[50,0,0],[50,50,50],[100,60,60]]) assert.equal(skill(b,g),want);
  for (let b = 0; b <= 100; b += 5) for (let g = 0; g <= 100; g += 5) {
    assert.ok(skill(b,g) <= b && skill(b,g) <= g);
    assert.equal(skill(b,g),skill(g,b));
    if (b < 100) assert.ok(skill(b+5,g) >= skill(b,g));
    if (g < 100) assert.ok(skill(b,g+5) >= skill(b,g));
  }
});

test('explicit invalid and missing skills reject instead of becoming enhanced skill', () => {
  const skill = fn('effectiveSkill');
  for (const bad of [undefined,null,NaN,Infinity,-Infinity,'50',{},-1,101]) {
    assert.throws(() => skill(bad,50), /skill/i);
    assert.throws(() => skill(50,bad), /skill/i);
  }
  assert.throws(() => skill(), /skill/i);
});

test('linear severity fades through six levels and ends at zero for all roles at 50+', () => {
  const params = fn('defectParameters');
  for (const role of ['drums','bass','melody']) {
    for (const [level,want] of [[0,1],[10,.8],[20,.6],[30,.4],[40,.2],[50,0],[100,0]]) {
      const p = params(role,level,level);
      assert.ok(Math.abs(p.strength-want)<1e-12);
      if (level >= 50) { assert.equal(p.detuneCents,0); assert.equal(p.offsetSeconds,0); assert.deepEqual(p.filters,[]); }
    }
  }
  assert.throws(() => params('theme',10,10), /role/i);
});

test('drums remove low and mid energy at novice level while retaining highs', () => {
  const process = fn('processRole');
  const amplitudes = [80,600,4000].map(hz => {
    const source = tone(hz);
    return rms(process([source],rate,'drums',0,0)[0].subarray(2400,9600)) / rms(source);
  });
  assert.ok(amplitudes[0] < .015, String(amplitudes));
  assert.ok(amplitudes[1] < .12, String(amplitudes));
  assert.ok(amplitudes[2] > .65, String(amplitudes));
});

test('bass EQ recesses lows and exaggerates the midrange using real PCM', () => {
  const filter = fn('filterPcm'), params = fn('defectParameters')('bass',0,0);
  const gains = [60,1000].map(hz => rms(filter([tone(hz)],rate,params.filters)[0].subarray(2400)) / Math.sqrt(.005));
  assert.ok(gains[0] < .12, String(gains));
  assert.ok(gains[1] > 3, String(gains));
});

test('melody EQ has a radio band and rejects energy outside it', () => {
  const filter = fn('filterPcm'), params = fn('defectParameters')('melody',0,0);
  const gains = [80,1100,5000].map(hz => rms(filter([tone(hz)],rate,params.filters)[0].subarray(2400)) / Math.sqrt(.005));
  assert.ok(gains[0] < .03 && gains[1] > .65 && gains[2] < .04, String(gains));
});

test('timing shifts an impulse by the requested samples with no pitch or stereo divergence', () => {
  const input = new Float32Array(12000); input[3000] = .5;
  const out = fn('shiftTiming')([input,Float32Array.from(input,x=>x*.5)],rate,.095);
  assert.equal(out[0][4140],.5);
  assert.equal(out[1][4140],.25);
  assert.equal(out[0][3000],0);
  assert.equal(out[0].length,input.length);
  const shiftedTone = fn('shiftTiming')([tone(440)],rate,-.13)[0];
  assert.ok(energy(shiftedTone,440) > .095);
});

test('timing boundaries fade rather than introduce hard steps', () => {
  const out = fn('shiftTiming')([new Float32Array(12000).fill(.5)],rate,.1)[0];
  assert.equal(out[0],0); assert.equal(out[1200],0); assert.equal(out.at(-1),0);
  let largestStep=0;
  for(let i=1;i<out.length;i++)largestStep=Math.max(largestStep,Math.abs(out[i]-out[i-1]));
  assert.ok(largestStep < .02, String(largestStep));
});

test('role timing signs do not confuse existing stage 1 melody with stage 2 bass', () => {
  const params = fn('defectParameters');
  assert.equal(params('drums',0,0).offsetSeconds,.095);
  assert.equal(params('bass',0,0).offsetSeconds,-.13);
  assert.equal(params('melody',0,0).offsetSeconds,.17);
  assert.ok(params('bass',0,0).detuneCents > 300);
  assert.ok(params('melody',0,0).detuneCents < -300);
});

const miniature = () => ({sampleRate:rate,durationSeconds:1,outputGain:.75,parts:[
  {id:'d',role:'drums',channels:[tone(4000)],sourceGainDb:-6,windows:[{startBar:0,bars:.375,sourceBar:0}]},
  {id:'b',role:'bass',channels:[tone(60)],sourceGainDb:-3,windows:[{startBar:0,bars:.375,sourceBar:0}]},
  {id:'m',role:'melody',channels:[tone(440)],sourceGainDb:0,windows:[{startBar:0,bars:.375,sourceBar:0}]},
  {id:'v',role:'vocal',channels:[tone(900)],sourceGainDb:-4,windows:[{startBar:0,bars:.375,sourceBar:0}]}
]});

test('frozen fixture retains seed-33 sources, stage-role mapping and original song windows', async () => {
  const fixture = JSON.parse(await readFile(new URL('../tools/audio/beat-skill-ladder-fixture.json',import.meta.url),'utf8').catch(()=> 'null'));
  assert.ok(fixture,'new frozen fixture missing');
  assert.equal(fixture.demoSeed,33);
  assert.deepEqual(fixture.parts.map(p=>[p.id,p.role]),[
    ['jura-experimental-20261018-drumm-4','drums'],['jura-experimental-20261018-lead-4','melody'],['jura-experimental-20261018-bass-4','bass'],['npc-artem-47','vocal']
  ]);
  assert.deepEqual(fixture.parts[2].windows,[{startBar:0,bars:2,sourceBar:0},{startBar:2,bars:4,sourceBar:0}]);
  assert.equal(fixture.parts[1].sourceGainDb,.1);
  assert.equal(fixture.parts[3].sourceGainDb,-3.98);
});
